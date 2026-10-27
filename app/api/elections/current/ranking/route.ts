import { getPublishedElection } from "@/lib/server/elections";
import { errorResponse, fromDbError } from "@/lib/server/errors";
import { supabaseAdmin } from "@/lib/server/supabase";
import type { RankingResponse } from "@/lib/types";

type Row = {
  precinct_id: string;
  number: number;
  polling_place_name: string;
  eligible_voters: number | null;
  official_turnout: number | string | null;
  pledged: number | string;
  voted: number | string;
};

// 公開中の選挙回の、投票区ごとの集計（ログイン不要）。並べ替えは画面側で行う
export async function GET() {
  try {
    const election = await getPublishedElection();
    if (!election) {
      return Response.json({ election: null } satisfies RankingResponse);
    }

    const { data, error } = await supabaseAdmin().rpc("precinct_ranking", {
      p_election_id: election.id,
    });
    if (error) throw fromDbError(error);

    const body: RankingResponse = {
      election,
      precincts: (data as Row[]).map((r) => ({
        precinctId: r.precinct_id,
        number: r.number,
        pollingPlaceName: r.polling_place_name,
        eligibleVoters: r.eligible_voters,
        officialTurnout: r.official_turnout == null ? null : Number(r.official_turnout),
        pledged: Number(r.pledged),
        voted: Number(r.voted),
      })),
    };
    return Response.json(body);
  } catch (e) {
    return errorResponse(e);
  }
}
