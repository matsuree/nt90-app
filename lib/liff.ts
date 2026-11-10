import type { Liff } from "@line/liff";

// NEXT_PUBLIC_ の値はビルド時にバンドルへ埋め込まれる。
// Vercel で値を変更したら Redeploy が必要。
export const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

let initPromise: Promise<Liff> | null = null;

/**
 * 初期化済みの LIFF を返す。何回呼んでも liff.init() は1回だけ実行される。
 * ブラウザ側（useEffect やイベントハンドラ）からだけ呼ぶこと。
 * 失敗した場合は、次に呼んだときにもう一度初期化を試す。
 */
export function getLiff(): Promise<Liff> {
  if (!initPromise) {
    initPromise = (async () => {
      if (!liffId) throw new Error("NEXT_PUBLIC_LIFF_ID が未設定");
      // SSR 時には window が無いため、ブラウザ側でのみ読み込む
      const liff = (await import("@line/liff")).default;
      await liff.init({ liffId });
      return liff;
    })().catch((e: unknown) => {
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}
