"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

// 取り消しのときだけ使う確認（docs/ui.md 3.3）
export function ConfirmDrawer({
  open,
  onOpenChange,
  title,
  confirmLabel,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <Drawer open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <DrawerFooter className="pt-6">
          <Button size="lg" variant="destructive" className="w-full" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            やめる
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
