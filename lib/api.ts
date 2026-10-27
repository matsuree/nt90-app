import type { Liff } from "@line/liff";
import type {
  ApiError,
  CurrentElectionResponse,
  ParticipationResponse,
} from "@/lib/types";

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const RELOGIN_FLAG = "nt90:relogin";

async function request<T>(
  path: string,
  init: RequestInit & { liff?: Liff } = {},
): Promise<T> {
  const { liff, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (liff) {
    const idToken = liff.getIDToken();
    if (idToken) headers.set("Authorization", `Bearer ${idToken}`);
  }
  if (rest.body) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(path, { ...rest, headers, cache: "no-store" });
  } catch {
    throw new ApiRequestError("NETWORK", "通信エラー");
  }

  if (res.ok) {
    sessionStorage.removeItem(RELOGIN_FLAG);
    return (await res.json()) as T;
  }

  const body = (await res.json().catch(() => null)) as ApiError | null;
  const code = body?.error.code ?? "INTERNAL";

  // IDトークンの期限切れ。1回だけログインし直す（何度も繰り返さないよう印を付ける）
  if (code === "UNAUTHORIZED" && liff && !sessionStorage.getItem(RELOGIN_FLAG)) {
    sessionStorage.setItem(RELOGIN_FLAG, "1");
    liff.logout();
    liff.login({ redirectUri: window.location.href });
  }
  throw new ApiRequestError(code, body?.error.message ?? "サーバーエラー");
}

export function fetchCurrentElection() {
  return request<CurrentElectionResponse>("/api/elections/current");
}

export function fetchParticipation(liff: Liff, electionId: string) {
  return request<ParticipationResponse>(
    `/api/participation?electionId=${encodeURIComponent(electionId)}`,
    { liff },
  );
}

type Action =
  | { kind: "pledge"; precinctId?: string }
  | { kind: "cancelPledge" }
  | { kind: "report"; precinctId?: string }
  | { kind: "cancelReport" }
  | { kind: "changePrecinct"; precinctId: string };

const ENDPOINTS: Record<Action["kind"], { path: string; method: string }> = {
  pledge: { path: "/api/participation/pledge", method: "POST" },
  cancelPledge: { path: "/api/participation/pledge", method: "DELETE" },
  report: { path: "/api/participation/report", method: "POST" },
  cancelReport: { path: "/api/participation/report", method: "DELETE" },
  changePrecinct: { path: "/api/participation/precinct", method: "PUT" },
};

export function postAction(liff: Liff, electionId: string, action: Action) {
  const { path, method } = ENDPOINTS[action.kind];
  const precinctId = "precinctId" in action ? action.precinctId : undefined;
  return request<ParticipationResponse>(path, {
    liff,
    method,
    body: JSON.stringify({ electionId, precinctId }),
  });
}
