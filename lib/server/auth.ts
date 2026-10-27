import "server-only";
import { createHmac } from "node:crypto";
import { serverEnv } from "./env";
import { ApiErrorException } from "./errors";

// 画面から Authorization: Bearer <IDトークン> で送られたトークンを LINE で検証し、
// LINEのユーザーIDを HMAC-SHA256 で変換した値を返す（docs/spec.md 7.2・7.3）。
// 元のユーザーIDはこの関数の外に出さない。
export async function authenticate(request: Request): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!idToken) {
    throw new ApiErrorException("UNAUTHORIZED");
  }

  const { lineChannelId, userIdHashSecret } = serverEnv();
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: lineChannelId }),
    cache: "no-store",
  });
  if (!res.ok) {
    // 期限切れ・別チャネルのトークンなど
    throw new ApiErrorException("UNAUTHORIZED");
  }

  const { sub } = (await res.json()) as { sub?: string };
  if (!sub) {
    throw new ApiErrorException("UNAUTHORIZED");
  }
  return createHmac("sha256", userIdHashSecret).update(sub).digest("hex");
}
