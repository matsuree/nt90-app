"use client";

import type { Liff } from "@line/liff";
import { InfoIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { useLiff } from "@/components/liff-provider";
import { PrecinctPicker } from "@/components/precinct-picker";
import {
  DoneScreen,
  ErrorScreen,
  LoadingScreen,
  NoElectionScreen,
} from "@/components/status-screens";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiRequestError, fetchCurrentElection, fetchParticipation, postAction } from "@/lib/api";
import { daysUntil, formatCount, formatDate, homeView } from "@/lib/election-status";
import type { CurrentElectionResponse, Participation } from "@/lib/types";

type Loaded = Extract<CurrentElectionResponse, { precincts: unknown }>;
type Action = Parameters<typeof postAction>[2];
type PickerPurpose = "pledge" | "report" | "change";
type ConfirmKind = "cancelPledge" | "cancelReport";

// 前回選んだ投票区の番号（端末内だけに保存。docs/spec.md 6.5）
const LAST_PRECINCT_KEY = "nt90:lastPrecinctNumber";

// 公開中の選挙回と、自分の参加状況をまとめて取得する
async function loadHome(liff: Liff) {
  const current = await fetchCurrentElection();
  const mine = current.election
    ? (await fetchParticipation(liff, current.election.id)).participation
    : null;
  return { current, mine };
}

export function Home() {
  const liffState = useLiff();

  if (liffState.status === "loading") return <LoadingScreen />;
  if (liffState.status === "error") {
    return <ErrorScreen message="LINEとの接続に失敗" detail={liffState.message} />;
  }
  return <HomeContent liff={liffState.liff} />;
}

function HomeContent({ liff }: { liff: Liff }) {
  const [data, setData] = useState<CurrentElectionResponse | null>(null);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<PickerPurpose | null>(null);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [done, setDone] = useState<"pledge" | "report" | null>(null);
  const [lastPrecinctNumber] = useState(
    () => Number(localStorage.getItem(LAST_PRECINCT_KEY)) || null,
  );

  // 読み込みが終わってから state を更新する（読み込み自体は loadHome で行う）
  const load = useCallback(
    () =>
      loadHome(liff).then(
        ({ current, mine }) => {
          setData(current);
          setParticipation(mine);
          setNow(new Date());
          setLoadError(null);
        },
        (e: unknown) => {
          setLoadError(e instanceof ApiRequestError ? e.message : "読み込みに失敗");
        },
      ),
    [liff],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loadError) return <ErrorScreen message={loadError} />;
  if (!data) return <LoadingScreen />;
  if (!data.election) return <NoElectionScreen />;

  const { election, precincts, totals } = data as Loaded;
  const view = homeView(election, participation, now);
  const voteDateLabel = formatDate(election.voteDate);
  const days = daysUntil(election.voteDate, now);
  const myPrecinct = precincts.find((p) => p.id === participation?.precinctId) ?? null;
  const initialPrecinctId =
    myPrecinct?.id ?? precincts.find((p) => p.number === lastPrecinctNumber)?.id ?? null;

  async function run(action: Action, onSuccess: () => void) {
    setBusy(true);
    try {
      const res = await postAction(liff, election.id, action);
      setParticipation(res.participation);
      const p = precincts.find((x) => x.id === res.participation?.precinctId);
      if (p) localStorage.setItem(LAST_PRECINCT_KEY, String(p.number));
      setPicker(null);
      setConfirm(null);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "通信エラー");
    } finally {
      setBusy(false);
      void load(); // 市全体の人数と受付状況を最新にする
    }
  }

  function onMain() {
    if (view.main === "pledge") {
      setPicker("pledge");
    } else if (view.main === "report") {
      // 宣言済みなら投票区は決まっているので、そのまま報告する
      if (participation) run({ kind: "report" }, () => setDone("report"));
      else setPicker("report");
    }
  }

  function onPickerConfirm(precinctId: string) {
    if (picker === "pledge") run({ kind: "pledge", precinctId }, () => setDone("pledge"));
    if (picker === "report") run({ kind: "report", precinctId }, () => setDone("report"));
    if (picker === "change") {
      run({ kind: "changePrecinct", precinctId }, () => toast.success("投票区を変更"));
    }
  }

  function onConfirmCancel() {
    if (confirm === "cancelPledge") {
      run({ kind: "cancelPledge" }, () => toast.success("宣言を取り消し"));
    } else {
      run({ kind: "cancelReport" }, () => toast.success("報告を取り消し"));
    }
  }

  if (done) {
    return <DoneScreen kind={done} voteDateLabel={voteDateLabel} onBack={() => setDone(null)} />;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-8">
      <header className="flex items-center justify-between">
        <p className="font-bold">流山投票率90%プロジェクト</p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="このアプリについて"
          nativeButton={false}
          render={<Link href="/about" />}
        >
          <InfoIcon />
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{election.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground">投票日 {voteDateLabel}</p>
          {days > 0 && (
            <p className="text-center">
              投票日まであと<span className="mx-1 text-4xl font-bold text-primary">{days}</span>日
            </p>
          )}
          {days === 0 && <p className="text-center text-2xl font-bold text-primary">本日投票日</p>}
        </CardContent>
      </Card>

      <p className="text-center text-lg">
        <span className="mr-1 text-3xl font-bold">
          {formatCount(view.countKind === "voted" ? totals.voted : totals.pledged)}
        </span>
        {view.countKind === "voted" ? "人が投票済み" : "人が投票宣言中"}
      </p>

      <div className="mt-auto flex flex-col items-center gap-3">
        {view.voted ? (
          <Badge variant="celebrate">投票済み</Badge>
        ) : (
          view.pledged && <Badge variant="accent">投票宣言済み</Badge>
        )}
        {view.note && <p className="text-muted-foreground">{view.note}</p>}

        {view.main && (
          <Button size="lg" className="w-full" disabled={busy} onClick={onMain}>
            {view.main === "pledge" ? "投票宣言をする" : "投票した"}
          </Button>
        )}

        <p className="text-sm text-muted-foreground">
          投票区：
          {myPrecinct ? `第${myPrecinct.number}投票区（${myPrecinct.pollingPlaceName}）` : "未選択"}
        </p>

        <div className="flex flex-wrap justify-center gap-x-2">
          {participation && view.pledgeOpen && (
            <Button variant="link" size="sm" onClick={() => setPicker("change")}>
              投票区を変更
            </Button>
          )}
          {view.pledged && view.pledgeOpen && (
            <Button variant="link" size="sm" onClick={() => setConfirm("cancelPledge")}>
              宣言を取り消す
            </Button>
          )}
          {view.voted && view.reportOpen && (
            <Button variant="link" size="sm" onClick={() => setConfirm("cancelReport")}>
              報告を取り消す
            </Button>
          )}
        </div>
      </div>

      <PrecinctPicker
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        precincts={precincts}
        initialPrecinctId={initialPrecinctId}
        confirmLabel={
          picker === "pledge" ? "この投票区で宣言" : picker === "report" ? "この投票区で報告" : "変更する"
        }
        busy={busy}
        onConfirm={onPickerConfirm}
      />

      <ConfirmDrawer
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "cancelPledge" ? "宣言を取り消す" : "報告を取り消す"}
        confirmLabel="取り消す"
        busy={busy}
        onConfirm={onConfirmCancel}
      />
    </div>
  );
}
