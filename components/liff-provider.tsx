"use client";

import type { Liff } from "@line/liff";
import { createContext, useContext, useEffect, useState } from "react";

// NEXT_PUBLIC_ の値はビルド時にバンドルへ埋め込まれる。
// Vercel で値を変更したら Redeploy が必要。
const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

type LiffState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; liff: Liff };

const LiffContext = createContext<LiffState>({ status: "loading" });

export function useLiff() {
  return useContext(LiffContext);
}

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LiffState>(
    liffId
      ? { status: "loading" }
      : { status: "error", message: "NEXT_PUBLIC_LIFF_ID が未設定" },
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
          liff.login({ redirectUri: window.location.href });
          return;
        }
        if (cancelled) return;
        setState({ status: "ready", liff });
      } catch (e) {
        if (cancelled) return;
        const message =
          e instanceof Error ? `${e.name}: ${e.message}` : JSON.stringify(e);
        setState({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <LiffContext.Provider value={state}>{children}</LiffContext.Provider>;
}
