"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ErrorScreen, LoadingScreen, NoElectionScreen } from "@/components/status-screens";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rankPrecincts, type RankingKind } from "@/lib/ranking";
import type { RankingResponse } from "@/lib/types";
import { RANKING_TABS, rankingContext, useRankingData } from "@/lib/use-ranking";
import { cn } from "@/lib/utils";

// Leaflet はブラウザでしか動かないため、サーバー側では読み込まない
const PrecinctMap = dynamic(() => import("@/components/precinct-map"), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

type Loaded = Extract<RankingResponse, { precincts: unknown }>;

// 凡例の色。globals.css の --chart-5（低い）〜 --chart-1（高い）
const LEGEND = ["bg-chart-5", "bg-chart-4", "bg-chart-3", "bg-chart-2", "bg-chart-1"];

// マップ（docs/ui.md S7、docs/spec.md 9.4）。
// 投票区の範囲データがまだないため、当面は投票所の位置に円を置いて色分けする
export function MapView() {
  const { loaded, loadError, myNumber } = useRankingData();
  const [kind, setKind] = useState<RankingKind | null>(null);

  if (loadError) return <ErrorScreen message={loadError} />;
  if (!loaded) return <LoadingScreen />;
  if (!loaded.data.election) return <NoElectionScreen />;

  const { election, precincts } = loaded.data as Loaded;
  const { defaultTab, pendingNote, periodNote } = rankingContext(election, precincts, loaded.now);
  const current = kind ?? defaultTab;
  const items = rankPrecincts(precincts, current);
  const pending = pendingNote[current];

  return (
    <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">投票区マップ</h1>
        <p className="text-sm text-muted-foreground">{election.name}</p>
      </header>

      <Tabs value={current} onValueChange={(v) => setKind(v as RankingKind)}>
        <TabsList className="w-full">
          {RANKING_TABS.map((t) => (
            <TabsTrigger key={t.kind} value={t.kind}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{pending ? `集計前（${pending}）` : periodNote[current]}</span>
        {!pending && (
          <span className="flex items-center gap-1" aria-label="色が濃いほど高い">
            低
            {LEGEND.map((c) => (
              <span key={c} className={cn("size-3 rounded-full", c)} />
            ))}
            高
          </span>
        )}
      </div>

      {/* Leaflet の重なり順が下部メニューやパネルに干渉しないよう、ここで閉じ込める */}
      <div className="isolate min-h-80 flex-1 overflow-hidden rounded-xl border">
        <PrecinctMap items={items} myNumber={myNumber} pending={!!pending} />
      </div>

      <p className="text-xs text-muted-foreground">
        円は投票所の位置。タップで詳細。色は最も高い投票区との比較
      </p>
    </div>
  );
}
