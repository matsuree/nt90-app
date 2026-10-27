import "server-only";
import type { Participation } from "@/lib/types";
import { ApiErrorException, fromDbError } from "./errors";
import { supabaseAdmin } from "./supabase";

type ParticipationRow = {
  election_precinct_id: string;
  pledged_at: string | null;
  voted_at: string | null;
} | null;

export function toParticipation(row: ParticipationRow): Participation | null {
  // 取り消しで記録が消えた場合、関数は null（または全項目 null の行）を返す
  if (!row || !row.election_precinct_id) return null;
  return {
    precinctId: row.election_precinct_id,
    pledgedAt: row.pledged_at,
    votedAt: row.voted_at,
  };
}

export async function getParticipation(electionId: string, userHash: string) {
  const { data, error } = await supabaseAdmin()
    .from("participations")
    .select("election_precinct_id, pledged_at, voted_at")
    .eq("election_id", electionId)
    .eq("user_hash", userHash)
    .maybeSingle();
  if (error) throw fromDbError(error);
  return toParticipation(data);
}

type Action = "pledge" | "cancel_pledge" | "report_vote" | "cancel_report" | "change_precinct";

// データベースの関数を呼ぶ。受付期間のチェックは関数の中で行う（supabase/migrations）
export async function runAction(
  action: Action,
  args: { electionId: string; userHash: string; precinctId?: string | null },
) {
  const params: Record<string, string | null> = {
    p_election_id: args.electionId,
    p_user_hash: args.userHash,
  };
  if (action === "pledge" || action === "report_vote" || action === "change_precinct") {
    params.p_precinct_id = args.precinctId ?? null;
  }
  const { data, error } = await supabaseAdmin().rpc(action, params);
  if (error) throw fromDbError(error);
  return toParticipation(data as ParticipationRow);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// リクエストの本文から electionId と precinctId を取り出す
export async function readBody(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiErrorException("BAD_REQUEST");
  }
  const { electionId, precinctId } = (body ?? {}) as Record<string, unknown>;
  if (typeof electionId !== "string" || !UUID.test(electionId)) {
    throw new ApiErrorException("BAD_REQUEST");
  }
  if (precinctId != null && (typeof precinctId !== "string" || !UUID.test(precinctId))) {
    throw new ApiErrorException("BAD_REQUEST");
  }
  return { electionId, precinctId: (precinctId as string | undefined) ?? null };
}

export function readElectionIdParam(request: Request) {
  const electionId = new URL(request.url).searchParams.get("electionId") ?? "";
  if (!UUID.test(electionId)) {
    throw new ApiErrorException("BAD_REQUEST");
  }
  return electionId;
}
