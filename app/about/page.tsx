import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "このアプリについて｜流山投票率90%プロジェクト" };

// S8 このアプリについて（docs/ui.md 4.2）
export default function AboutPage() {
  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <BackLink href="/" label="ホーム" />

      <Card>
        <CardHeader>
          <CardTitle>流山投票率90%プロジェクト</CardTitle>
        </CardHeader>
        <CardContent>
          <p>流山市の投票率90%を目指す市民活動</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>個人情報の取り扱い</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p>保存するのは、元に戻せない形に変換したID・投票区・宣言と報告の日時のみ</p>
          <Link href="/privacy" className="text-primary underline">
            プライバシーポリシー（仮）
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>データの出典</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              投票所・有権者数：
              <a
                href="https://www.city.nagareyama.chiba.jp/information/1008966/index.html"
                className="text-primary underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                流山市
              </a>
              （投票所所在地データ：CC BY 4.0）
            </li>
            <li>
              地図：
              <a
                href="https://maps.gsi.go.jp/development/ichiran.html"
                className="text-primary underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                地理院タイル
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
