"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ApiRequestError, fetchRanking } from "@/lib/api";
import { formatDate } from "@/lib/election-status";
import { readLastPrecinctNumber } from "@/lib/last-precinct";
import type { RankingKind } from "@/lib/ranking";
import type { Election, PrecinctStats, RankingResponse } from "@/lib/types";

export const RANKING_TABS: { kind: RankingKind; label: string }[] = [
  { kind: "pledged", label: "宣言率" },
  { kind: "voted", label: "投票報告率" },
  { kind: "official", label: "投票率" },
];

const noopSubscribe = () => () => {};

// ランキングとマップで共通のデータ読み込み
export function useRankingData() {
  // 現在時刻は読み込み完了時に一緒に記録する（事前レンダリング中に時刻を読まないため）
  const [loaded, setLoaded] = useState<{ data: RankingResponse; now: Date } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 端末に保存した投票区番号。サーバー側の事前レンダリングでは null
  const myNumber = useSyncExternalStore(noopSubscribe, readLastPrecinctNumber, () => null);

  useEffect(() => {
    fetchRanking().then(
      (data) => setLoaded({ data, now: new Date() }),
      (e: unknown) => setLoadError(e instanceof ApiRequestError ? e.message : "読み込みに失敗"),
    );
  }, []);

  return { loaded, loadError, myNumber };
}

// 最初に開くタブと、集計前・集計期間の文言（docs/spec.md 9.1・9.2）
export function rankingContext(election: Election, precincts: PrecinctStats[], now: Date) {
  const hasOfficial = precincts.some((p) => p.officialTurnout != null);
  const reportStarted = now >= new Date(election.reportStartAt);
  const defaultTab: RankingKind = hasOfficial ? "official" : reportStarted ? "voted" : "pledged";

  // 集計前のランキングで出す文言。null なら集計結果を出す
  const pendingNote: Record<RankingKind, string | null> = {
    pledged: null,
    voted: reportStarted ? null : `${formatDate(election.reportStartAt)}から集計`,
    official: hasOfficial ? null : "選挙後に公表",
  };
  const periodNote: Record<RankingKind, string> = {
    pledged: `${formatDate(election.pledgeEndAt)}まで集計`,
    voted: `${formatDate(election.reportEndAt)}まで集計`,
    official: "選挙管理委員会の公表値",
  };
  return { defaultTab, pendingNote, periodNote };
}
