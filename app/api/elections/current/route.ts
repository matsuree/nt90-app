import { getPublishedElection } from "@/lib/server/elections";
import { errorResponse, fromDbError } from "@/lib/server/errors";
import { supabaseAdmin } from "@/lib/server/supabase";
import type { CurrentElectionResponse } from "@/lib/types";

// 公開中の選挙回・投票区の一覧・市全体の人数（ログイン不要）
export async function GET() {
  try {
    const election = await getPublishedElection();
    if (!election) {
      return Response.json({ election: null } satisfies CurrentElectionResponse);
    }

    const db = supabaseAdmin();
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
      election,
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
