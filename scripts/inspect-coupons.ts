/**
 * LINE Messaging API のクーポンAPIのレスポンスを調べるための使い捨てスクリプト。
 *
 * 実行: npx tsx scripts/inspect-coupons.ts
 *
 * - .env.local の LINE_CHANNEL_ACCESS_TOKEN を使う（トークン自体は表示しない）
 * - 一覧（全ステータス、ページングあり）と、各クーポンの詳細をそのまま表示する
 * - 出力にはクーポンコード等が含まれ得るので、結果はコミットしないこと
 */

const API_BASE = "https://api.line.me/v2/bot/coupon";
const MAX_DETAILS = 20;

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local が無くても、環境変数に設定済みならそのまま続行する
}

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!token) {
  console.error("LINE_CHANNEL_ACCESS_TOKEN が設定されていません（.env.local を確認してください）");
  process.exit(1);
}

async function get(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // JSON でなければテキストのまま
  }
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${url}`);
    console.error(JSON.stringify(body, null, 2));
    throw new Error(`request failed: ${res.status}`);
  }
  return body;
}

/** オブジェクトを再帰的にたどり、URLらしき文字列を「パス: 値」で集める */
function findUrls(value: unknown, path = "$", out: string[] = []): string[] {
  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    out.push(`${path}: ${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => findUrls(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) findUrls(v, `${path}.${k}`, out);
  }
  return out;
}

type ListResponse = { items: { couponId: string; title: string }[]; next?: string };

async function main() {
  // --- 一覧（status 省略 = 全ステータス）。next があれば続けて取得 ---
  const all: ListResponse["items"] = [];
  let start: string | undefined;
  let page = 0;
  do {
    const params = new URLSearchParams({ limit: "100" });
    if (start) params.set("start", start);
    const res = (await get(`${API_BASE}?${params}`)) as ListResponse;
    page++;
    console.log(`\n===== 一覧 page ${page} (raw) =====`);
    console.log(JSON.stringify(res, null, 2));
    console.log(`トップレベルのキー: ${Object.keys(res).join(", ")}`);
    all.push(...res.items);
    start = res.next;
  } while (start);

  // --- 参考: status=RUNNING で絞り込んだ件数 ---
  const running = (await get(`${API_BASE}?limit=100&status=RUNNING`)) as ListResponse;
  console.log(`\n全件: ${all.length} 件 / status=RUNNING: ${running.items.length} 件`);

  // --- 詳細 ---
  const allKeys = new Set<string>();
  for (const { couponId } of all.slice(0, MAX_DETAILS)) {
    const detail = (await get(`${API_BASE}/${encodeURIComponent(couponId)}`)) as Record<string, unknown>;
    Object.keys(detail).forEach((k) => allKeys.add(k));
    console.log(`\n===== 詳細 ${couponId} (raw) =====`);
    console.log(JSON.stringify(detail, null, 2));
    const urls = findUrls(detail);
    console.log(`URLらしき値: ${urls.length ? "\n  " + urls.join("\n  ") : "なし"}`);
  }
  if (all.length > MAX_DETAILS) console.log(`\n（詳細は先頭 ${MAX_DETAILS} 件のみ表示）`);

  console.log(`\n===== 詳細レスポンスに現れたキー（全クーポンの和集合） =====`);
  console.log([...allKeys].sort().join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
