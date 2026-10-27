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
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-xs font-semibold text-muted-foreground",
                  active && "text-primary",
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
