-- ランキング用の集計（docs/spec.md 8.2）
-- Supabase の SQL Editor に貼り付けて実行する。
--
-- 投票区ごとの宣言数・投票報告数と、有権者数・公式投票率を返す。
-- 割合の計算と並べ替えはサーバー側（Next.js）で行う。

create function public.precinct_ranking(p_election_id uuid)
returns table (
  precinct_id uuid,
  number integer,
  polling_place_name text,
  eligible_voters integer,
  official_turnout numeric,
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
