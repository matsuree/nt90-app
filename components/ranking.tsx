"use client";

import { ErrorScreen, LoadingScreen, NoElectionScreen } from "@/components/status-screens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCount } from "@/lib/election-status";
import { formatRate, rankPrecincts, type RankedPrecinct } from "@/lib/ranking";
import type { RankingResponse } from "@/lib/types";
import { RANKING_TABS as TABS, rankingContext, useRankingData } from "@/lib/use-ranking";
import { cn } from "@/lib/utils";

type Loaded = Extract<RankingResponse, { precincts: unknown }>;

// ランキング（docs/ui.md S6、docs/spec.md 8.2・9章）
export function Ranking() {
  const { loaded, loadError, myNumber } = useRankingData();

  if (loadError) return <ErrorScreen message={loadError} />;
  if (!loaded) return <LoadingScreen />;
  if (!loaded.data.election) return <NoElectionScreen />;

  const { election, precincts } = loaded.data as Loaded;
  const { defaultTab, pendingNote, periodNote } = rankingContext(election, precincts, loaded.now);

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-6">
      <header>
        <h1 className="text-xl font-bold">投票区ランキング</h1>
        <p className="text-sm text-muted-foreground">{election.name}</p>
      </header>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full">
          {TABS.map((t) => (
            <TabsTrigger key={t.kind} value={t.kind}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => {
          const ranked = rankPrecincts(precincts, t.kind);
          const mine = ranked.find((r) => r.stats.number === myNumber) ?? null;
          return (
            <TabsContent key={t.kind} value={t.kind} className="flex flex-col gap-4 pt-2">
              {pendingNote[t.kind] ? (
                <p className="py-12 text-center text-lg font-bold text-muted-foreground">
                  集計前（{pendingNote[t.kind]}）
                </p>
              ) : (
                <>
                  <MyPrecinctCard mine={mine} total={ranked.length} />
                  <p className="text-sm text-muted-foreground">{periodNote[t.kind]}</p>
                  <ol className="flex flex-col">
                    {ranked.map((r) => (
                      <RankingRow key={r.stats.precinctId} item={r} highlighted={r === mine} />
                    ))}
                  </ol>
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function MyPrecinctCard({ mine, total }: { mine: RankedPrecinct | null; total: number }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>あなたの投票区</CardTitle>
      </CardHeader>
      <CardContent>
        {mine ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-semibold">第{mine.stats.number}投票区</p>
              <p className="text-sm text-muted-foreground">{mine.stats.pollingPlaceName}</p>
            </div>
            <p className="text-right">
              <span className="text-3xl font-bold text-primary">{mine.rank ?? "—"}</span>
              <span className="text-sm text-muted-foreground">位 / {total}</span>
              <span className="block text-sm">{formatRate(mine.rate)}</span>
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">投票区未選択</p>
        )}
      </CardContent>
    </Card>
  );
}

function RankingRow({ item, highlighted }: { item: RankedPrecinct; highlighted: boolean }) {
  const top3 = item.rank != null && item.rank <= 3;
  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b px-2 py-3 last:border-b-0",
        highlighted && "rounded-lg bg-accent",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full font-bold",
          top3 ? "bg-celebrate text-celebrate-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {item.rank ?? "—"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">第{item.stats.number}投票区</span>
        <span className="block truncate text-sm text-muted-foreground">
          {item.stats.pollingPlaceName}
        </span>
      </span>
      <span className="text-right">
        <span className="block font-bold">{formatRate(item.rate)}</span>
        {item.count != null && (
          <span className="block text-sm text-muted-foreground">{formatCount(item.count)}人</span>
        )}
      </span>
    </li>
  );
}
