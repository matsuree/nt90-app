import type { Election, Participation } from "@/lib/types";

// ホーム画面に出す内容（docs/ui.md 4.3）。最終的な受付期間のチェックはサーバー側で行う
export type HomeView = {
  pledgeOpen: boolean; // 宣言の受付中
  reportOpen: boolean; // 投票報告の受付中
  pledged: boolean;
  voted: boolean;
  main: "pledge" | "report" | null; // メインボタン
  note: string | null; // ボタンの代わりに出す短い文言
  countKind: "pledged" | "voted"; // 市全体の人数として出すもの
};

export function homeView(election: Election, participation: Participation | null, now: Date): HomeView {
  const t = now.getTime();
  const pledgeOpen = isWithin(t, election.pledgeStartAt, election.pledgeEndAt);
  const reportOpen = isWithin(t, election.reportStartAt, election.reportEndAt);
  const pledged = !!participation?.pledgedAt;
  const voted = !!participation?.votedAt;

  let main: HomeView["main"] = null;
  if (!voted && reportOpen) main = "report";
  else if (!voted && !pledged && pledgeOpen) main = "pledge";

  let note: string | null = null;
  if (!pledgeOpen && !reportOpen) {
    if (t < Date.parse(election.pledgeStartAt)) note = "宣言受付前";
    else if (t > Date.parse(election.reportEndAt)) note = "受付終了";
    else if (t < Date.parse(election.reportStartAt)) note = `投票報告は${formatDate(election.reportStartAt)}から`;
    else note = "宣言受付終了";
  } else if (pledged && !voted && !reportOpen) {
    note = `投票報告は${formatDate(election.reportStartAt)}から`;
  }

  const countKind = t >= Date.parse(election.reportStartAt) ? "voted" : "pledged";

  return { pledgeOpen, reportOpen, pledged, voted, main, note, countKind };
}

function isWithin(t: number, start: string, end: string) {
  return Date.parse(start) <= t && t <= Date.parse(end);
}

const TZ = "Asia/Tokyo";

// 「4月25日(日)」
export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? parseDate(value) : value;
  const md = new Intl.DateTimeFormat("ja-JP", { timeZone: TZ, month: "long", day: "numeric" }).format(date);
  const wd = new Intl.DateTimeFormat("ja-JP", { timeZone: TZ, weekday: "short" }).format(date);
  return `${md}(${wd})`;
}

// 投票日（YYYY-MM-DD）まであと何日か。日本時間の日付で数える
export function daysUntil(voteDate: string, now: Date) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(now); // YYYY-MM-DD
  return Math.round((Date.parse(voteDate) - Date.parse(today)) / 86_400_000);
}

// 日付だけの文字列は日本時間の正午として扱い、タイムゾーンで日付がずれないようにする
function parseDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+09:00`) : new Date(value);
}

export function formatCount(n: number) {
  return n.toLocaleString("ja-JP");
}
