"use client";

import { ChevronRightIcon, TicketIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getLiff } from "@/lib/liff";
import { cn } from "@/lib/utils";

export type CouponCardProps = {
  title: string;
  rewardLabel: string | null;
  periodLabel: string;
  imageUrl: string | null;
  /** LINE のクーポン画面を開くURL。null なら「準備中」として表示する */
  shareUrl: string | null;
};

export function CouponCard({ title, rewardLabel, periodLabel, imageUrl, shareUrl }: CouponCardProps) {
  const [opening, setOpening] = useState(false);

  // タップ時に待たないよう、表示したときに LIFF の初期化を始めておく（初期化は1回だけ）
  useEffect(() => {
    if (shareUrl) getLiff().catch(() => {});
  }, [shareUrl]);

  async function open() {
    if (!shareUrl || opening) return;
    setOpening(true);
    try {
      // 初期化が済んでいなければ、ここで完了を待つ
      const liff = await getLiff();
      liff.openWindow({ url: shareUrl, external: false });
    } catch {
      // LIFF が使えない環境（初期化失敗など）では、通常のページ遷移で開く
      toast.error("LINEの画面を開けなかったため、ブラウザで開きます");
      window.location.href = shareUrl;
    } finally {
      setOpening(false);
    }
  }

  const body = (
    <>
      {imageUrl ? (
        <div className="relative aspect-[3/2] w-full bg-muted">
          <Image src={imageUrl} alt="" fill unoptimized className="object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[3/1] w-full items-center justify-center bg-accent">
          <TicketIcon className="size-10 text-accent-foreground" aria-hidden />
        </div>
      )}
      <div className="flex items-center gap-3 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-bold break-words">{title}</p>
          {rewardLabel && <p className="text-lg font-bold text-primary">{rewardLabel}</p>}
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        {shareUrl ? (
          <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <Badge variant="secondary">準備中</Badge>
        )}
      </div>
    </>
  );

  const className = cn(
    "w-full overflow-hidden rounded-xl bg-card text-left text-card-foreground ring-1 ring-foreground/10",
    shareUrl ? "transition-opacity active:opacity-70 disabled:opacity-70" : "opacity-60",
  );

  if (!shareUrl) {
    return (
      <div className={className} aria-disabled>
        {body}
      </div>
    );
  }
  return (
    <button type="button" className={className} onClick={open} disabled={opening}>
      {body}
    </button>
  );
}
