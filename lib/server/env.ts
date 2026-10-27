import "server-only";

// サーバー側だけで使う環境変数。NEXT_PUBLIC_ を付けないので、ブラウザには配信されない
export function serverEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  const userIdHashSecret = process.env.USER_ID_HASH_SECRET;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  const missing = Object.entries({
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SECRET_KEY: supabaseSecretKey,
    USER_ID_HASH_SECRET: userIdHashSecret,
    NEXT_PUBLIC_LIFF_ID: liffId,
  })
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`環境変数が設定されていません: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseSecretKey: supabaseSecretKey!,
    userIdHashSecret: userIdHashSecret!,
    // LIFF ID は「チャネルID-ランダムな文字列」の形式。IDトークンの検証にはチャネルIDを使う
    lineChannelId: liffId!.split("-")[0],
  };
}
