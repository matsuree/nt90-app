import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "流山投票率90%プロジェクト",
  description: "流山市の投票率向上を目指す市民活動のLINEミニアプリ",
};

export const viewport: Viewport = {
  themeColor: "#faf6ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
