"use client";

import { HouseIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// 画面下のタブ（docs/ui.md 4.1）。マップはフェーズ3で追加する
const ITEMS = [
  { href: "/", label: "ホーム", icon: HouseIcon },
  { href: "/ranking", label: "ランキング", icon: TrophyIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex justify-center py-1.5"
              >
                {/* 選択中は薄い緑の丸い背景で囲み、未選択のグレーと見分けやすくする */}
                <span
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-full px-5 py-1 text-xs font-semibold text-muted-foreground",
                    active && "bg-accent text-accent-foreground",
                  )}
                >
                  <Icon className="size-6" aria-hidden />
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
