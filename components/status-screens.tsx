"use client";

import { CircleAlertIcon, Loader2Icon, PartyPopperIcon, VoteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function CenterScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      {children}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <CenterScreen>
      <Loader2Icon className="size-8 animate-spin text-primary" aria-hidden />
      <p className="text-muted-foreground">読み込み中</p>
    </CenterScreen>
  );
}

// S5 エラー。実機でのデバッグ用に詳細も小さく出す
export function ErrorScreen({ message, detail }: { message: string; detail?: string }) {
  return (
    <CenterScreen>
      <CircleAlertIcon className="size-10 text-destructive" aria-hidden />
      <p className="text-lg font-bold">{message}</p>
      {detail && (
        <p className="text-sm break-all whitespace-pre-wrap text-muted-foreground">{detail}</p>
      )}
      <Button variant="outline" onClick={() => window.location.reload()}>
        再読み込み
      </Button>
    </CenterScreen>
  );
}

// S4 選挙がないとき
export function NoElectionScreen() {
  return (
    <CenterScreen>
      <VoteIcon className="size-12 text-primary" aria-hidden />
      <p className="text-lg font-bold">次の選挙まで準備中</p>
    </CenterScreen>
  );
}

// S3 完了
export function DoneScreen({
  kind,
  voteDateLabel,
  onBack,
}: {
  kind: "pledge" | "report";
  voteDateLabel: string;
  onBack: () => void;
}) {
  return (
    <CenterScreen>
      <PartyPopperIcon className="size-14 text-celebrate" aria-hidden />
      <Badge variant="celebrate">{kind === "pledge" ? "投票宣言済み" : "投票済み"}</Badge>
      <p className="text-2xl font-bold">{kind === "pledge" ? "投票宣言完了" : "投票報告完了"}</p>
      {kind === "pledge" && <p className="text-muted-foreground">投票日 {voteDateLabel}</p>}
      <Button size="lg" className="mt-6 w-full" onClick={onBack}>
        ホームへ
      </Button>
    </CenterScreen>
  );
}
