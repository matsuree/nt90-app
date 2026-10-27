"use client";

import { Home } from "@/components/home";
import { LiffProvider } from "@/components/liff-provider";

export default function Page() {
  return (
    <LiffProvider>
      <Home />
    </LiffProvider>
  );
}
