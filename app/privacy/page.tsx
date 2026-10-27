import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { Markdown } from "@/components/markdown";

export const metadata: Metadata = { title: "プライバシーポリシー｜流山投票率90%プロジェクト" };

// 本文は docs/privacy-policy.md をビルド時に読み込む。「作成メモ」以降は載せない
async function loadPolicy() {
  "use cache";
  const source = await readFile(path.join(process.cwd(), "docs", "privacy-policy.md"), "utf-8");
  return source.split(/^## 作成メモ/m)[0].replace(/\n---\s*$/, "");
}

export default async function PrivacyPage() {
  const body = await loadPolicy();

  return (
    <main className="px-4 py-4">
      <BackLink href="/about" label="このアプリについて" />
      <Markdown>{body}</Markdown>
    </main>
  );
}
