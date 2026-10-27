"use client";

import { CheckIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Precinct } from "@/lib/types";

// 投票区の選択（docs/ui.md S2、docs/spec.md 6.3）
export function PrecinctPicker({
  open,
  onOpenChange,
  precincts,
  initialPrecinctId,
  confirmLabel,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  precincts: Precinct[];
  initialPrecinctId: string | null;
  confirmLabel: string;
  busy: boolean;
  onConfirm: (precinctId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialPrecinctId);

  // 開くたびに検索語と選択を初期状態に戻す
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setSelectedId(initialPrecinctId);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return precincts;
    return precincts.filter(
      (p) =>
        String(p.number) === q.replace(/^第|投票区$/g, "") ||
        p.pollingPlaceName.includes(q) ||
        (p.areaTowns ?? "").includes(q),
    );
  }, [precincts, query]);

  return (
    <Drawer open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>投票区の選択</DrawerTitle>
          <DrawerDescription>投票所入場整理券の投票所で選択</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pt-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="投票所名・番号で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {filtered.map((p) => {
            const selected = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left",
                    selected && "bg-accent text-accent-foreground",
                  )}
                >
                  <span className="flex-1">
                    <span className="block font-semibold">第{p.number}投票区</span>
                    <span className="block text-sm text-muted-foreground">{p.pollingPlaceName}</span>
                    {p.areaTowns && (
                      <span className="block text-sm text-muted-foreground">{p.areaTowns}</span>
                    )}
                  </span>
                  {selected && <CheckIcon className="size-5 shrink-0" />}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="py-6 text-center text-muted-foreground">該当なし</li>
          )}
        </ul>

        <DrawerFooter className="pt-2">
          <Button
            size="lg"
            className="w-full"
            disabled={!selectedId || busy}
            onClick={() => selectedId && onConfirm(selectedId)}
          >
            {confirmLabel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
