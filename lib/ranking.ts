import type { PrecinctStats } from "@/lib/types";

// ランキングの種類（docs/spec.md 8.2）
export type RankingKind = "pledged" | "voted" | "official";

export type RankedPrecinct = {
  stats: PrecinctStats;
  rate: number | null; // %。有権者数や公式投票率がなければ null
  count: number | null; // 人数。公式投票率では null
  rank: number | null; // 同率は同順位（1, 2, 2, 4 …）。rate が null なら null
};

export function rankPrecincts(precincts: PrecinctStats[], kind: RankingKind): RankedPrecinct[] {
  const items = precincts.map((stats): RankedPrecinct => {
    if (kind === "official") {
      return { stats, rate: stats.officialTurnout, count: null, rank: null };
    }
    const count = kind === "pledged" ? stats.pledged : stats.voted;
    const rate = stats.eligibleVoters ? (count / stats.eligibleVoters) * 100 : null;
    return { stats, rate, count, rank: null };
  });

  // 割合の高い順。割合がないものは最後に投票区番号順で並べる
  items.sort((a, b) => {
    if (a.rate == null || b.rate == null) {
      return a.rate == null && b.rate == null
        ? a.stats.number - b.stats.number
        : a.rate == null ? 1 : -1;
    }
    return b.rate - a.rate || a.stats.number - b.stats.number;
  });

  items.forEach((item, i) => {
    if (item.rate == null) return;
    const prev = items[i - 1];
    item.rank = prev && prev.rate === item.rate ? prev.rank : i + 1;
  });
  return items;
}

export function formatRate(rate: number | null) {
  return rate == null ? "—" : `${rate.toFixed(2)}%`;
}
