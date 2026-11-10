// クーポンID → LINE Official Account Manager の「シェア用URL」の対応表。
//
// Messaging API のクーポンAPIはシェア用URLを返さない（2026-11-10 に実レスポンスで確認）ため、
// ここで手動で対応づける。シェア用URLは公開前提のURLなので、Publicリポジトリに置いてよい。
//
// 追加手順：
//   1. LINE Official Account Manager → クーポン → 対象クーポンの「シェア」からURLをコピー
//   2. クーポンIDは `npx tsx scripts/inspect-coupons.ts` の出力で確認
//   3. 下の表に 1 行追加する
//
// 将来は Supabase のテーブルに移す予定。読み出しは getCouponShareUrl() だけを通すこと。
const COUPON_SHARE_URLS: Record<string, string> = {
  // "01M71E9SRR8BXK63MBQE55KR1G": "https://...", // テスト用クーポン
};

/** クーポンのシェア用URLを返す。対応表に無ければ null */
export function getCouponShareUrl(couponId: string): string | null {
  return COUPON_SHARE_URLS[couponId] ?? null;
}
