import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 mb-2" nativeButton={false} render={<Link href={href} />}>
      <ChevronLeftIcon />
      {label}
    </Button>
  );
}
