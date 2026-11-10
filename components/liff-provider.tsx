"use client";

import type { Liff } from "@line/liff";
import { createContext, useContext, useEffect, useState } from "react";
import { getLiff, liffId } from "@/lib/liff";

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
        // 初期化は lib/liff.ts で1回だけ行う（クーポン一覧など他の画面と共有）
        const liff = await getLiff();

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
