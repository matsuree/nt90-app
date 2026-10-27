"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { formatCount } from "@/lib/election-status";
import { formatRate, type RankedPrecinct } from "@/lib/ranking";

// 地理院タイル（淡色地図）。出典表示が必要（docs/spec.md 9.4・12章）
const TILE_URL = "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル</a>｜投票所：流山市';

// 色の段階数。globals.css の --chart-1（濃い）〜 --chart-5（薄い）を使う
const COLOR_STEPS = 5;

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
function colorStep(rate: number | null, maxRate: number) {
  if (rate == null) return null;
  if (maxRate <= 0) return 0;
  return Math.min(COLOR_STEPS - 1, Math.floor((rate / maxRate) * COLOR_STEPS));
}

// 吹き出しの中身。投票所名などは textContent で入れる
function popupContent(item: RankedPrecinct, mine: boolean, pending: boolean) {
  const root = document.createElement("div");
  const line = (text: string, className: string) => {
    const el = document.createElement("span");
    el.className = className;
    el.textContent = text;
    root.appendChild(el);
  };
  line(`第${item.stats.number}投票区${mine ? "（あなたの投票区）" : ""}`, "block text-sm font-bold");
  line(item.stats.pollingPlaceName, "block text-xs");
  if (!pending) {
    const rank = item.rank != null ? `${item.rank}位　` : "";
    const count = item.count != null ? `（${formatCount(item.count)}人）` : "";
    line(`${rank}${formatRate(item.rate)}${count}`, "mt-1 block text-sm");
  }
  return root;
}

type Located = RankedPrecinct & { stats: { latitude: number; longitude: number } };

// react-leaflet は使わず、Leaflet を直接扱う。
// Next.js（cacheComponents）は画面を離れても DOM を残したまま Effect だけを片付け、戻ると Effect を再実行する。
// そのため、Effect の中で地図を作り、片付けで必ず map.remove() する。
export default function PrecinctMap({
  items,
  myNumber,
  pending,
}: {
  items: RankedPrecinct[];
  myNumber: number | null;
  pending: boolean; // 集計前なら色分けしない
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const located = useMemo(
    () => items.filter((i): i is Located => i.stats.latitude != null && i.stats.longitude != null),
    [items],
  );

  // 地図を作るときだけ使う、最初の表示範囲（投票所すべてが入る範囲）
  const initialBounds = useEffectEvent(() =>
    L.latLngBounds(located.map((i) => [i.stats.latitude, i.stats.longitude])),
  );

  useEffect(() => {
    if (!containerRef.current) return; // 位置データがなく、地図の入れ物を出していない
    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    const bounds = initialBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] });
    return () => {
      map.remove();
      markersRef.current = null;
    };
  }, []);

  // 円を描き直す（タブの切り替えや、画面に戻ったときの地図の作り直しのあと）
  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    const colors = themeColors();
    const maxRate = Math.max(0, ...located.map((i) => i.rate ?? 0));

    layer.clearLayers();
    for (const item of located) {
      const step = pending ? 0 : colorStep(item.rate, maxRate);
      const mine = item.stats.number === myNumber;
      L.circleMarker([item.stats.latitude, item.stats.longitude], {
        radius: mine ? 14 : 11,
        color: mine ? colors.mine : colors.border,
        weight: mine ? 4 : 2,
        fillColor: step == null ? colors.none : colors.steps[step],
        fillOpacity: 0.9,
      })
        .bindPopup(() => popupContent(item, mine, pending))
        .addTo(layer);
    }
  }, [located, myNumber, pending]);

  if (located.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">位置データなし</p>;
  }
  return <div ref={containerRef} className="h-full w-full" />;
}
