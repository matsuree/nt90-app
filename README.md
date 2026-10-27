# nt90-app

流山市の投票率向上を目指す市民活動「流山投票率90%プロジェクト」のWebアプリです。
LINE公式アカウント内のWebビュー（LIFF / LINEミニアプリ）として動作します。

将来的には、地区別の投票（宣言）率ランキング・マップやクーポン機能を提供する予定です。
現段階では「LINEアプリ内でLIFFが開き、ログインユーザーの表示名が出る」ことの確認だけを行います。

## 技術スタック

- Next.js（App Router / TypeScript / Tailwind CSS / ESLint）
- LIFF SDK：`@line/liff`
- ホスティング：Vercel
- DB：Supabase（後続タスクで導入予定）

## ローカル開発

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_LIFF_ID に LIFF ID を記入
npm run dev
```

- `npm run build`：本番ビルド
- `npm run lint`：Lint

`.env*` は `.gitignore` 済みです（`.env.example` のみコミット）。秘密情報はコミットしないでください。
なお `NEXT_PUBLIC_` で始まる値はブラウザに配信されるため、秘密情報を入れてはいけません。

## 画面の内容

`app/page.tsx` で LIFF を初期化し、次を表示します。

- `liff.getProfile()` の表示名
- `liff.isInClient()`（LINEアプリ内で開いているか）
- `liff.getOS()`

未ログインの場合は `liff.login()` でログインへ遷移します。
LIFF ID が未設定の場合や初期化に失敗した場合は、エラー内容を画面に表示します（実機デバッグ用）。

## 初回セットアップ手順（手動）

1. Vercel の URL が出たら、LINE Developers で同じプロバイダーに LIFF（LINEミニアプリ）チャネルを作る。
   - エンドポイントURL：Vercel の URL
   - サイズ：Full
   - Scope：`openid`、`profile`
   - 友だち追加オプション：On（作成済みの公式アカウントを紐づける）
2. 発行された LIFF ID を、Vercel の環境変数 `NEXT_PUBLIC_LIFF_ID` に設定して Redeploy する。
   - `NEXT_PUBLIC_` の値はビルド時に埋め込まれるため、設定後の Redeploy が必須です。
3. `https://liff.line.me/{LIFF_ID}` を LINE のトークに送り、iPhone と Android で開いて表示名が出るか確認する。
4. 確認できたら、公式アカウントのリッチメニューにこの URL を設定する。
