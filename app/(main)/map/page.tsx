import type { Metadata } from "next";
import { MapView } from "@/components/map-view";

export const metadata: Metadata = { title: "マップ｜流山投票率90%プロジェクト" };

export default function MapPage() {
  return <MapView />;
}
