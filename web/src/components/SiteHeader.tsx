"use client";

import Link from "next/link";
import { WalletConnect } from "@/components/WalletConnect";
import { ritualChain } from "@/config/wagmi";

export function SiteHeader() {
  return (
    <header className="bg-ink">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-5 sm:px-10">
        <Link href="/" className="font-serif text-[21px] font-medium leading-none">
          SealedVerdict
        </Link>
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-stone md:block">
          {ritualChain.name} · ID {ritualChain.id} · Commit-Reveal Adjudication
        </span>
        <WalletConnect />
      </div>
      <div className="rule-double" />
    </header>
  );
}
