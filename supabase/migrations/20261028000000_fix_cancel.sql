-- 取り消しの不具合修正
-- Supabase の SQL Editor に貼り付けて実行する。
--
-- 不具合：宣言だけ（または報告だけ）の状態で取り消すと、いったん pledged_at と voted_at が
-- 両方 null の行に更新しようとして check 制約に違反し、サーバーエラーになっていた。
-- 修正：取り消した後に何も残らない場合は、更新せずに行を削除する。
-- create or replace なので、実行権限（service_role のみ）はそのまま引き継がれる。

-- 宣言を取り消す
create or replace function public.cancel_pledge(p_election_id uuid, p_user_hash text)
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

  select * into r from public.participations
  where election_id = p_election_id and user_hash = p_user_hash
  for update;
  if not found then
    raise exception 'NOT_PARTICIPATING';
  end if;

  if r.voted_at is null then
    delete from public.participations where id = r.id;
    return null;
  end if;

  update public.participations
  set pledged_at = null, updated_at = now()
  where id = r.id
  returning * into r;
  return r;
end;
$$;

-- 投票報告を取り消す
create or replace function public.cancel_report(p_election_id uuid, p_user_hash text)
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
    raise exception 'NOT_PARTICIPATING';
  end if;

  if r.pledged_at is null then
    delete from public.participations where id = r.id;
    return null;
  end if;

  update public.participations
  set voted_at = null, updated_at = now()
  where id = r.id
  returning * into r;
  return r;
end;
$$;
