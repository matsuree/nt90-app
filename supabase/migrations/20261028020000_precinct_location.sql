-- 投票所の位置（マップ用。docs/spec.md 9.4）
-- Supabase の SQL Editor に貼り付けて実行する。
--
-- - election_precincts に投票所の緯度・経度を追加する（任意。選挙ごとに投票所が変わることがあるため投票区側に持つ）。
-- - precinct_ranking() が緯度・経度も返すようにする。戻り値の形が変わるため、いったん削除して作り直す。

alter table public.election_precincts
  add column latitude double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180);

comment on column public.election_precincts.latitude is '投票所の緯度（流山市「投票所所在地データ」CC BY 4.0）';
comment on column public.election_precincts.longitude is '投票所の経度（流山市「投票所所在地データ」CC BY 4.0）';

drop function public.precinct_ranking(uuid);

create function public.precinct_ranking(p_election_id uuid)
returns table (
  precinct_id uuid,
  number integer,
  polling_place_name text,
  eligible_voters integer,
  official_turnout numeric,
  latitude double precision,
  longitude double precision,
  pledged bigint,
  voted bigint
)
language sql
stable
set search_path = ''
as $$
  select
    ep.id,
    ep.number,
    ep.polling_place_name,
    ep.eligible_voters,
    ep.official_turnout,
    ep.latitude,
    ep.longitude,
    count(p.id) filter (where p.pledged_at is not null),
    count(p.id) filter (where p.voted_at is not null)
  from public.election_precincts ep
  left join public.participations p on p.election_precinct_id = ep.id
  where ep.election_id = p_election_id
  group by ep.id
  order by ep.number;
$$;

revoke execute on function public.precinct_ranking(uuid) from public, anon, authenticated;
grant execute on function public.precinct_ranking(uuid) to service_role;
