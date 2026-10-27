"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngBoundsExpression } from "leaflet";
import { useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { formatCount } from "@/lib/election-status";
import { formatRate, type RankedPrecinct } from "@/lib/ranking";

// 地理院タイル（淡色地図）。出典表示が必要（docs/spec.md 9.4・12章）
const TILE_URL = "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル</a>｜投票所：流山市';

// 色の段階数。globals.css の --chart-1（濃い）〜 --chart-5（薄い）を使う
export const COLOR_STEPS = 5;

function themeColors() {
  const style = getComputedStyle(document.documentElement);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return {
    // 段階 0（低い）〜 4（高い）
    steps: [v("--chart-5"), v("--chart-4"), v("--chart-3"), v("--chart-2"), v("--chart-1")],
    none: v("--muted-foreground"),
    border: v("--card"),
    mine: v("--celebrate"),
  };
}

// 最大値に対する割合で5段階に分ける（宣言率などは値が小さいため、絶対値ではなく相対で塗る）
export function colorStep(rate: number | null, maxRate: number) {
  if (rate == null) return null;
  if (maxRate <= 0) return 0;
  return Math.min(COLOR_STEPS - 1, Math.floor((rate / maxRate) * COLOR_STEPS));
}

export default function PrecinctMap({
  items,
  myNumber,
  pending,
}: {
  items: RankedPrecinct[];
  myNumber: number | null;
  pending: boolean; // 集計前なら色分けしない
}) {
  const [colors] = useState(themeColors);
  const located = items.filter((i) => i.stats.latitude != null && i.stats.longitude != null);
  const maxRate = Math.max(0, ...located.map((i) => i.rate ?? 0));

  // 最初の表示範囲は投票所すべてが入るようにする（タブを切り替えても変えない）
  const [bounds] = useState<LatLngBoundsExpression>(() =>
    located.map((i) => [i.stats.latitude!, i.stats.longitude!] as [number, number]),
  );

  if (located.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">位置データなし</p>;
  }

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [24, 24] }}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={18} />
      {located.map((item) => {
        const step = pending ? 0 : colorStep(item.rate, maxRate);
        const mine = item.stats.number === myNumber;
        return (
          <CircleMarker
            key={item.stats.precinctId}
            center={[item.stats.latitude!, item.stats.longitude!]}
            radius={mine ? 14 : 11}
            pathOptions={{
              color: mine ? colors.mine : colors.border,
              weight: mine ? 4 : 2,
              fillColor: step == null ? colors.none : colors.steps[step],
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <span className="block text-sm font-bold">
                第{item.stats.number}投票区{mine && "（あなたの投票区）"}
              </span>
              <span className="block text-xs">{item.stats.pollingPlaceName}</span>
              {!pending && (
                <span className="mt-1 block text-sm">
                  {item.rank != null && `${item.rank}位　`}
                  {formatRate(item.rate)}
                  {item.count != null && `（${formatCount(item.count)}人）`}
                </span>
              )}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
