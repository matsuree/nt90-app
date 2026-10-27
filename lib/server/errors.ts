import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ApiError } from "@/lib/types";

// エラーコードと、画面に出す短い文言（docs/ui.md 3.4）
const ERRORS = {
  UNAUTHORIZED: { status: 401, message: "ログイン情報の確認に失敗" },
  BAD_REQUEST: { status: 400, message: "リクエストが不正" },
  ELECTION_NOT_FOUND: { status: 404, message: "受付中の選挙なし" },
  PRECINCT_NOT_FOUND: { status: 400, message: "投票区が見つからない" },
  PRECINCT_REQUIRED: { status: 400, message: "投票区の選択が必要" },
  PLEDGE_CLOSED: { status: 409, message: "宣言受付終了" },
  REPORT_CLOSED: { status: 409, message: "報告受付期間外" },
  PRECINCT_LOCKED: { status: 409, message: "投票区の変更は宣言受付期間内のみ" },
  NOT_PARTICIPATING: { status: 409, message: "宣言・報告の記録なし" },
  INTERNAL: { status: 500, message: "サーバーエラー" },
} as const;

export type ErrorCode = keyof typeof ERRORS;

export class ApiErrorException extends Error {
  constructor(public code: ErrorCode) {
    super(code);
  }
}

// データベースの関数が投げた例外（メッセージがエラーコード）を ApiErrorException に変える
export function fromDbError(error: { message: string }): ApiErrorException {
  const code = error.message in ERRORS ? (error.message as ErrorCode) : "INTERNAL";
  if (code === "INTERNAL") {
    console.error("database error:", error);
  }
  return new ApiErrorException(code);
}

export function errorResponse(e: unknown): Response {
  // Next.js が内部で使う例外（事前レンダリングの中断など）は握りつぶさずに投げ直す
  unstable_rethrow(e);
  const code: ErrorCode = e instanceof ApiErrorException ? e.code : "INTERNAL";
  if (!(e instanceof ApiErrorException)) {
    console.error(e);
  }
  const { status, message } = ERRORS[code];
  const body: ApiError = { error: { code, message } };
  return Response.json(body, { status });
}
