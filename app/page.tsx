"use client";

import { useEffect, useState } from "react";

// NEXT_PUBLIC_ の値はビルド時にバンドルへ埋め込まれる。
// Vercel で値を変更したら Redeploy が必要。
const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

type LiffState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      displayName: string;
      isInClient: boolean;
      os: string | undefined;
    };

export default function Home() {
  const [state, setState] = useState<LiffState>(
    liffId
      ? { status: "loading" }
      : {
          status: "error",
          message:
            "NEXT_PUBLIC_LIFF_ID が設定されていません。環境変数を設定してから再ビルド（Redeploy）してください。",
        },
  );

  useEffect(() => {
    if (!liffId) return;

    let cancelled = false;

    (async () => {
      try {
        // SSR 時には window が無いため、ブラウザ側でのみ読み込む
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          // ログイン画面へ遷移し、戻ってきたら再度この処理が走る
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        if (cancelled) return;
        setState({
          status: "ready",
          displayName: profile.displayName,
          isInClient: liff.isInClient(),
          os: liff.getOS(),
        });
      } catch (e) {
        if (cancelled) return;
        const message =
          e instanceof Error
            ? `${e.name}: ${e.message}`
            : JSON.stringify(e, null, 2);
        setState({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-6">
      <h1 className="text-xl font-bold">流山投票率90%プロジェクト</h1>

      {state.status === "loading" && <p>LIFF を初期化しています…</p>}

      {state.status === "error" && (
        <div className="rounded border border-red-400 bg-red-50 p-4 text-red-800">
          <p className="font-bold">エラーが発生しました</p>
          <pre className="mt-2 whitespace-pre-wrap break-all text-sm">
            {state.message}
          </pre>
        </div>
      )}

      {state.status === "ready" && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="font-bold">表示名</dt>
          <dd>{state.displayName}</dd>
          <dt className="font-bold">isInClient</dt>
          <dd>{String(state.isInClient)}</dd>
          <dt className="font-bold">OS</dt>
          <dd>{state.os ?? "unknown"}</dd>
        </dl>
      )}
    </main>
  );
}
