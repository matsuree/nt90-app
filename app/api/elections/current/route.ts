import { errorResponse, fromDbError } from "@/lib/server/errors";
import { supabaseAdmin } from "@/lib/server/supabase";
import type { CurrentElectionResponse } from "@/lib/types";

// 公開中の選挙回・投票区の一覧・市全体の人数（ログイン不要）
export async function GET() {
  try {
    const db = supabaseAdmin();

    const { data: election, error } = await db
      .from("elections")
      .select(
        "id, name, description, vote_date, pledge_start_at, pledge_end_at, report_start_at, report_end_at",
      )
      .eq("status", "published")
      .order("vote_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw fromDbError(error);
    if (!election) {
      return Response.json({ election: null } satisfies CurrentElectionResponse);
    }

    const [precincts, totals] = await Promise.all([
      db
        .from("election_precincts")
        .select("id, number, polling_place_name, area_towns")
        .eq("election_id", election.id)
        .order("number"),
      db.rpc("election_totals", { p_election_id: election.id }).single<{
        pledged: number;
        voted: number;
      }>(),
    ]);
    if (precincts.error) throw fromDbError(precincts.error);
    if (totals.error) throw fromDbError(totals.error);

    const body: CurrentElectionResponse = {
      election: {
        id: election.id,
        name: election.name,
        description: election.description,
        voteDate: election.vote_date,
        pledgeStartAt: election.pledge_start_at,
        pledgeEndAt: election.pledge_end_at,
        reportStartAt: election.report_start_at,
        reportEndAt: election.report_end_at,
      },
      precincts: precincts.data.map((p) => ({
        id: p.id,
        number: p.number,
        pollingPlaceName: p.polling_place_name,
        areaTowns: p.area_towns,
      })),
      totals: {
        pledged: Number(totals.data.pledged),
        voted: Number(totals.data.voted),
      },
    };
    return Response.json(body);
  } catch (e) {
    return errorResponse(e);
  }
}
