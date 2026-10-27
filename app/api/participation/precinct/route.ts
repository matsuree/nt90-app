import { authenticate } from "@/lib/server/auth";
import { ApiErrorException, errorResponse } from "@/lib/server/errors";
import { readBody, runAction } from "@/lib/server/participation";
import type { ParticipationResponse } from "@/lib/types";

// 投票区を変更する（宣言の受付期間内だけ）
export async function PUT(request: Request) {
  try {
    const { electionId, precinctId } = await readBody(request);
    if (!precinctId) throw new ApiErrorException("PRECINCT_REQUIRED");
    const userHash = await authenticate(request);
    const participation = await runAction("change_precinct", { electionId, userHash, precinctId });
    return Response.json({ participation } satisfies ParticipationResponse);
  } catch (e) {
    return errorResponse(e);
  }
}
