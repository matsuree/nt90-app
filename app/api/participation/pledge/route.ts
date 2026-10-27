import { authenticate } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { readBody, runAction } from "@/lib/server/participation";
import type { ParticipationResponse } from "@/lib/types";

// 宣言する
export async function POST(request: Request) {
  try {
    const { electionId, precinctId } = await readBody(request);
    const userHash = await authenticate(request);
    const participation = await runAction("pledge", { electionId, userHash, precinctId });
    return Response.json({ participation } satisfies ParticipationResponse);
  } catch (e) {
    return errorResponse(e);
  }
}

// 宣言を取り消す
export async function DELETE(request: Request) {
  try {
    const { electionId } = await readBody(request);
    const userHash = await authenticate(request);
    const participation = await runAction("cancel_pledge", { electionId, userHash });
    return Response.json({ participation } satisfies ParticipationResponse);
  } catch (e) {
    return errorResponse(e);
  }
}
