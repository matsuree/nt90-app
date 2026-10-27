import { BottomNav } from "@/components/bottom-nav";
import { LiffProvider } from "@/components/liff-provider";

// ホーム・ランキングなど、LINEログインが必要な画面の共通レイアウト。
// タブを切り替えても LIFF の初期化をやり直さないよう、ここで1回だけ行う
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <LiffProvider>
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav />
    </LiffProvider>
  );
}
