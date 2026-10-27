// 前回選んだ投票区の番号。端末内（localStorage）だけに保存する（docs/spec.md 6.5）
const KEY = "nt90:lastPrecinctNumber";

export function readLastPrecinctNumber(): number | null {
  return Number(localStorage.getItem(KEY)) || null;
}

export function saveLastPrecinctNumber(number: number) {
  localStorage.setItem(KEY, String(number));
}
