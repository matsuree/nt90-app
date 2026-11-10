import "server-only";

import { cacheLife } from "next/cache";

// LINE Messaging API のクーポンAPI（公式アカウントのクーポンを取得する）
// https://developers.line.biz/ja/reference/messaging-api/#get-coupons-list
// https://developers.line.biz/ja/reference/messaging-api/#get-coupon
const API_BASE = "https://api.line.me/v2/bot/coupon";

/** 詳細APIの reward（カード表示に使う部分だけ） */
export type CouponReward = {
  type: "discount" | "free" | "gift" | "cashBack" | "others";
  priceInfo?: {
    type: "fixed" | "percentage" | "explicit";
    fixedAmount?: number;
    percentage?: number;
    originalPrice?: number;
    priceAfterDiscount?: number;
  };
};

/** 一覧のカードに使う項目。クーポンコードなど、開封後に見せる項目は含めない */
export type Coupon = {
  couponId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  usageCondition?: string;
  reward?: CouponReward;
  /** 有効期間（UNIX秒） */
  startTimestamp: number;
  endTimestamp: number;
};

type CouponListResponse = {
  items: { couponId: string; title: string }[];
  next?: string;
};

type CouponDetailResponse = Coupon & { status: "DRAFT" | "RUNNING" | "CLOSED" };

function accessToken() {
  // NEXT_PUBLIC_ を付けないので、ブラウザ向けのバンドルには入らない
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("環境変数が設定されていません: LINE_CHANNEL_ACCESS_TOKEN");
  return token;
}

async function lineGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken()}` } });
  if (!res.ok) {
    throw new Error(`LINE クーポンAPIの呼び出しに失敗: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * status=RUNNING（有効期間前または有効期間中）のクーポンを、詳細つきで取得する。
 * 結果は5分間キャッシュする。失敗したときは例外を投げる（例外はキャッシュされない）。
 *
 * cacheComponents が有効なため、fetch の `next: { revalidate }` ではなく
 * `"use cache"` + `cacheLife` でキャッシュする（Next.js 16 の方式）。
 * 期間中かどうかの判定は現在時刻に依存するので、呼び出し側で行う。
 */
export async function getRunningCoupons(): Promise<Coupon[]> {
  "use cache";
  cacheLife({ revalidate: 300 });

  const ids: string[] = [];
  let start: string | undefined;
  do {
    const params = new URLSearchParams({ limit: "100", status: "RUNNING" });
    if (start) params.set("start", start);
    const page = await lineGet<CouponListResponse>(`${API_BASE}?${params}`);
    ids.push(...page.items.map((item) => item.couponId));
    start = page.next;
  } while (start);

  const details = await Promise.all(
    ids.map((id) => lineGet<CouponDetailResponse>(`${API_BASE}/${encodeURIComponent(id)}`)),
  );

  return details
    .filter((d) => d.status === "RUNNING")
    .map((d) => ({
      couponId: d.couponId,
      title: d.title,
      description: d.description || undefined,
      imageUrl: d.imageUrl || undefined,
      usageCondition: d.usageCondition || undefined,
      reward: d.reward,
      startTimestamp: d.startTimestamp,
      endTimestamp: d.endTimestamp,
    }));
}

/**
 * status=RUNNING には有効期間前のものも含まれるので、いま使えるものだけに絞る。
 * 期限が近い順に並べる。
 */
export function selectActiveCoupons(coupons: Coupon[], now: Date = new Date()): Coupon[] {
  const nowSec = now.getTime() / 1000;
  return coupons
    .filter((c) => c.startTimestamp <= nowSec && nowSec < c.endTimestamp)
    .sort((a, b) => a.endTimestamp - b.endTimestamp);
}
