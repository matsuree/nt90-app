-- 初期スキーマ（docs/spec.md 11章）
-- Supabase の SQL Editor に貼り付けて実行する。
--
-- 方針
-- - 画面側から Supabase に直接つながない。読み書きはすべて Next.js のサーバー側から、
--   Secret key（service_role 権限）で行う。
-- - そのため、全テーブルで Row Level Security を有効にし、ポリシーは作らない
--   （= 公開用の鍵では一切読み書きできない）。
-- - 宣言・投票報告の書き込みは、受付期間のチェックと書き込みを同時に行う関数経由にする。

-- ============================================================
-- テーブル
-- ============================================================

-- 選挙回
create table public.elections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  vote_date date not null,
  pledge_start_at timestamptz not null,
  pledge_end_at timestamptz not null,
  report_start_at timestamptz not null,
  report_end_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  check (pledge_start_at < pledge_end_at),
  check (report_start_at < report_end_at)
);

comment on table public.elections is '選挙回。同じ日に行う複数の選挙はまとめて1件にする';
comment on column public.elections.pledge_end_at is '宣言の締め切り。投票日前日の23:59（日本時間）';
comment on column public.elections.report_start_at is '投票報告の受付開始。期日前投票の初日 0:00（日本時間）';
comment on column public.elections.report_end_at is '投票報告の締め切り。投票日の23:59（日本時間）';

-- 選挙回ごとの投票区
create table public.election_precincts (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  number integer not null check (number > 0),
  polling_place_name text not null,
  polling_place_address text,
  area_towns text,
  eligible_voters integer check (eligible_voters >= 0),
  official_turnout numeric(5, 2) check (official_turnout between 0 and 100),
  unique (election_id, number),
  -- participations から「同じ選挙回の投票区か」を外部キーで確かめるため
  unique (id, election_id)
);

comment on column public.election_precincts.area_towns is '区域の町名（任意。当面は空欄）';
comment on column public.election_precincts.eligible_voters is '有権者数（ランキング1・2の分母）';
comment on column public.election_precincts.official_turnout is '公式投票率（%）。選挙後に登録する';

-- 参加レコード（宣言・投票報告）
create table public.participations (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  user_hash text not null,
  election_precinct_id uuid not null,
  pledged_at timestamptz,
  voted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (election_id, user_hash),
  foreign key (election_precinct_id, election_id)
    references public.election_precincts (id, election_id) on delete cascade,
  -- 宣言も報告もしていないレコードは残さない（取り消しで両方 null になったら削除する）
  check (pledged_at is not null or voted_at is not null)
);

comment on column public.participations.user_hash is 'LINEのユーザーIDを HMAC-SHA256 で変換した値（元のIDは保存しない）';

create index participations_precinct_idx on public.participations (election_precinct_id);

-- ============================================================
-- アクセス制限
-- ============================================================

alter table public.elections enable row level security;
alter table public.election_precincts enable row level security;
alter table public.participations enable row level security;

revoke all on public.elections, public.election_precincts, public.participations
  from anon, authenticated;

-- ============================================================
-- 宣言・投票報告の操作（docs/spec.md 8.1）
-- ============================================================
-- エラーは例外のメッセージで返す。サーバー側でこのコードを見て画面の文言に変える。
--   ELECTION_NOT_FOUND   公開中の選挙回がない
--   PRECINCT_NOT_FOUND   その選挙回の投票区ではない
--   PLEDGE_CLOSED        宣言の受付期間外
--   REPORT_CLOSED        投票報告の受付期間外
--   PRECINCT_REQUIRED    初めての参加なのに投票区の指定がない
--   PRECINCT_LOCKED      宣言の締め切り後に投票区を変えようとした
--   NOT_PARTICIPATING    参加レコードがない

-- 公開中の選挙回を取得し、なければ例外にする
create function public._published_election(p_election_id uuid)
returns public.elections
language plpgsql
stable
set search_path = ''
as $$
declare
  e public.elections;
begin
  select * into e from public.elections
  where id = p_election_id and status = 'published';
  if not found then
    raise exception 'ELECTION_NOT_FOUND';
  end if;
  return e;
end;
$$;

-- 投票区がその選挙回のものか確かめる
create function public._check_precinct(p_election_id uuid, p_precinct_id uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.election_precincts
    where id = p_precinct_id and election_id = p_election_id
  ) then
    raise exception 'PRECINCT_NOT_FOUND';
  end if;
end;
$$;

-- 宣言する（投票区の指定は、初めての参加のときと、変更するときだけでよい）
create function public.pledge(p_election_id uuid, p_user_hash text, p_precinct_id uuid default null)
returns public.participations
language plpgsql
set search_path = ''
as $$
declare
  e public.elections := public._published_election(p_election_id);
  r public.participations;
begin
  if now() < e.pledge_start_at or now() > e.pledge_end_at then
    raise exception 'PLEDGE_CLOSED';
  end if;
  if p_precinct_id is not null then
    perform public._check_precinct(p_election_id, p_precinct_id);
  end if;

  select * into r from public.participations
  where election_id = p_election_id and user_hash = p_user_hash
  for update;

  if not found then
    if p_precinct_id is null then
      raise exception 'PRECINCT_REQUIRED';
    end if;
    insert into public.participations (election_id, user_hash, election_precinct_id, pledged_at)
    values (p_election_id, p_user_hash, p_precinct_id, now())
    returning * into r;
  else
    update public.participations
    set pledged_at = coalesce(pledged_at, now()),
        election_precinct_id = coalesce(p_precinct_id, election_precinct_id),
        updated_at = now()
    where id = r.id
    returning * into r;
  end if;
  return r;
end;
$$;

-- 宣言を取り消す
create function public.cancel_pledge(p_election_id uuid, p_user_hash text)
returns public.participations
language plpgsql
set search_path = ''
as $$
declare
  e public.elections := public._published_election(p_election_id);
  r public.participations;
begin
  if now() < e.pledge_start_at or now() > e.pledge_end_at then
    raise exception 'PLEDGE_CLOSED';
  end if;

  update public.participations
  set pledged_at = null, updated_at = now()
  where election_id = p_election_id and user_hash = p_user_hash
  returning * into r;
  if not found then
    raise exception 'NOT_PARTICIPATING';
  end if;

  if r.voted_at is null then
    delete from public.participations where id = r.id;
    return null;
  end if;
  return r;
end;
$$;

-- 投票報告する（宣言していない人は、投票区の指定が必要）
create function public.report_vote(p_election_id uuid, p_user_hash text, p_precinct_id uuid default null)
returns public.participations
language plpgsql
set search_path = ''
as $$
declare
  e public.elections := public._published_election(p_election_id);
  r public.participations;
begin
  if now() < e.report_start_at or now() > e.report_end_at then
    raise exception 'REPORT_CLOSED';
  end if;

  select * into r from public.participations
  where election_id = p_election_id and user_hash = p_user_hash
  for update;

  if not found then
    if p_precinct_id is null then
      raise exception 'PRECINCT_REQUIRED';
    end if;
    perform public._check_precinct(p_election_id, p_precinct_id);
    insert into public.participations (election_id, user_hash, election_precinct_id, voted_at)
    values (p_election_id, p_user_hash, p_precinct_id, now())
    returning * into r;
  else
    -- 既に参加している人の投票区は、ここでは変えない（変更は change_precinct で行う）
    update public.participations
    set voted_at = coalesce(voted_at, now()), updated_at = now()
    where id = r.id
    returning * into r;
  end if;
  return r;
end;
$$;

-- 投票報告を取り消す
create function public.cancel_report(p_election_id uuid, p_user_hash text)
returns public.participations
language plpgsql
set search_path = ''
as $$
declare
  e public.elections := public._published_election(p_election_id);
  r public.participations;
begin
  if now() < e.report_start_at or now() > e.report_end_at then
    raise exception 'REPORT_CLOSED';
  end if;

  update public.participations
  set voted_at = null, updated_at = now()
  where election_id = p_election_id and user_hash = p_user_hash
  returning * into r;
  if not found then
    raise exception 'NOT_PARTICIPATING';
  end if;

  if r.pledged_at is null then
    delete from public.participations where id = r.id;
    return null;
  end if;
  return r;
end;
$$;

-- 投票区を変更する（宣言の受付期間内だけ）
create function public.change_precinct(p_election_id uuid, p_user_hash text, p_precinct_id uuid)
returns public.participations
language plpgsql
set search_path = ''
as $$
declare
  e public.elections := public._published_election(p_election_id);
  r public.participations;
begin
  if now() < e.pledge_start_at or now() > e.pledge_end_at then
    raise exception 'PRECINCT_LOCKED';
  end if;
  perform public._check_precinct(p_election_id, p_precinct_id);

  update public.participations
  set election_precinct_id = p_precinct_id, updated_at = now()
  where election_id = p_election_id and user_hash = p_user_hash
  returning * into r;
  if not found then
    raise exception 'NOT_PARTICIPATING';
  end if;
  return r;
end;
$$;

-- 市全体の宣言数・投票報告数
create function public.election_totals(p_election_id uuid)
returns table (pledged bigint, voted bigint)
language sql
stable
set search_path = ''
as $$
  select
    count(*) filter (where pledged_at is not null),
    count(*) filter (where voted_at is not null)
  from public.participations
  where election_id = p_election_id;
$$;

-- 関数は Supabase の初期設定で誰でも実行できるため、service_role 以外から取り上げる
revoke execute on function
  public._published_election(uuid),
  public._check_precinct(uuid, uuid),
  public.pledge(uuid, text, uuid),
  public.cancel_pledge(uuid, text),
  public.report_vote(uuid, text, uuid),
  public.cancel_report(uuid, text),
  public.change_precinct(uuid, text, uuid),
  public.election_totals(uuid)
  from public, anon, authenticated;

grant execute on function
  public._published_election(uuid),
  public._check_precinct(uuid, uuid),
  public.pledge(uuid, text, uuid),
  public.cancel_pledge(uuid, text),
  public.report_vote(uuid, text, uuid),
  public.cancel_report(uuid, text),
  public.change_precinct(uuid, text, uuid),
  public.election_totals(uuid)
  to service_role;
