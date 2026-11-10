import { CircleAlertIcon, Loader2Icon, TicketIcon } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCouponShareUrl } from "@/lib/coupon-links";
import {
  type Coupon,
  type CouponReward,
  getRunningCoupons,
  selectActiveCoupons,
} from "@/lib/line/coupons";
import { CouponCard } from "./CouponCard";

export const metadata: Metadata = { title: "クーポン｜流山投票率90%プロジェクト" };

// クーポン（下部タブの1つ。ランキングと同じ見出しの構成にそろえる）
export default function CouponsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-6">
      <header>
        <h1 className="text-xl font-bold">クーポン</h1>
      </header>
      <Suspense fallback={<Message icon="loading">読み込み中</Message>}>
        <CouponList />
      </Suspense>
    </div>
  );
}

async function CouponList() {
  // ビルド時ではなくリクエスト時に取得する（期間の判定に現在時刻を使うため）。
  // API の結果自体は getRunningCoupons() 側で5分間キャッシュされる
  await connection();

  let coupons: Coupon[];
  try {
    coupons = await getRunningCoupons();
  } catch (e) {
    console.error(e);
    return <Message icon="error">クーポンを読み込めませんでした。時間をおいて再度お試しください</Message>;
  }

  const active = selectActiveCoupons(coupons);

  if (active.length === 0) {
    return <Message icon="empty">いま配布中のクーポンはありません</Message>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {active.map((c) => (
        <li key={c.couponId}>
          <CouponCard
            title={c.title}
            rewardLabel={rewardLabel(c.reward)}
            periodLabel={`${formatDateTime(c.endTimestamp)}まで`}
            imageUrl={c.imageUrl ?? null}
            shareUrl={getCouponShareUrl(c.couponId)}
          />
        </li>
      ))}
    </ul>
  );
}

const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

function rewardLabel(reward: CouponReward | undefined): string | null {
  const p = reward?.priceInfo;
  switch (reward?.type) {
    case "discount":
      if (p?.type === "fixed" && p.fixedAmount != null) return `${yen(p.fixedAmount)}引き`;
      if (p?.type === "percentage" && p.percentage != null) return `${p.percentage}%引き`;
      if (p?.type === "explicit" && p.priceAfterDiscount != null) {
        return p.originalPrice != null
          ? `${yen(p.priceAfterDiscount)}（通常${yen(p.originalPrice)}）`
          : yen(p.priceAfterDiscount);
      }
      return "割引";
    case "cashBack":
      if (p?.type === "fixed" && p.fixedAmount != null) return `${yen(p.fixedAmount)}キャッシュバック`;
      if (p?.type === "percentage" && p.percentage != null) return `${p.percentage}%キャッシュバック`;
      return "キャッシュバック";
    case "free":
      return "無料";
    case "gift":
      return "プレゼント";
    default:
      return null;
  }
}

// 流山市向けのアプリなので、日本時間で表示する
function formatDateTime(unixSeconds: number) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

function Message({ icon, children }: { icon: "loading" | "empty" | "error"; children: React.ReactNode }) {
  const Icon = icon === "loading" ? Loader2Icon : icon === "error" ? CircleAlertIcon : TicketIcon;
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Icon
        className={
          icon === "loading"
            ? "size-8 animate-spin text-primary"
            : icon === "error"
              ? "size-10 text-destructive"
              : "size-10 text-muted-foreground"
        }
        aria-hidden
      />
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
