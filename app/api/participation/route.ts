import { authenticate } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { getParticipation, readElectionIdParam } from "@/lib/server/participation";
import type { ParticipationResponse } from "@/lib/types";

// 自分の参加状況（GET /api/participation?electionId=...）
export async function GET(request: Request) {
  try {
    const electionId = readElectionIdParam(request);
    const userHash = await authenticate(request);
    const participation = await getParticipation(electionId, userHash);
    return Response.json({ participation } satisfies ParticipationResponse);
  } catch (e) {
    return errorResponse(e);
  }
}
