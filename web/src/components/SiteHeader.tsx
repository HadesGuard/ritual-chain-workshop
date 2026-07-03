"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletChip } from "@/components/WalletConnect";

export function SvMark({ size = 34 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      className="flex items-center justify-center rounded-[12px] border border-indigo-deep bg-indigo font-semibold text-indigo-tint2 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.28),inset_0_2px_4px_rgba(255,255,255,0.25)]"
    >
      SV
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const onCreate = pathname?.startsWith("/create");

  const navItem = (active: boolean) =>
    active
      ? "px-4 h-full flex items-center text-[14px] font-semibold text-ink"
      : "px-4 h-full flex items-center text-[14px] font-medium text-muted hover:text-ink";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-stretch justify-between border-b-[1.5px] border-line bg-surface">
      <Link
        href="/"
        className="flex items-center gap-[13px] border-r-[1.5px] border-line px-[22px]"
      >
        <SvMark />
        <div className="leading-none">
          <div className="text-[19px] font-semibold tracking-[-0.01em]">SealedVerdict</div>
          <div className="mt-[3px] font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
            Sealed contests · paid on-chain
          </div>
        </div>
      </Link>

      <div className="flex items-stretch">
        <Link href="/" className={navItem(!onCreate)}>
          Bounties
        </Link>
        <Link href="/create" className={navItem(!!onCreate)}>
          Post a bounty
        </Link>
        <div className="my-3 w-[1.5px] rounded bg-ink" />
        <div className="flex items-center px-4">
          <WalletChip />
        </div>
      </div>
    </header>
  );
}
