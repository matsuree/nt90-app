import type { Metadata } from "next";
import { Ranking } from "@/components/ranking";

export const metadata: Metadata = { title: "ランキング｜流山投票率90%プロジェクト" };

export default function RankingPage() {
  return <Ranking />;
}
