"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletChip } from "@/components/WalletConnect";

export function SvMark({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-[10px] bg-green text-on-accent shadow-[0_0_18px_rgba(53,208,127,0.45)]"
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 2l3 3-3 3-3-3 3-3zM12 16l3 3-3 3-3-3 3-3zM4 9l3 3-3 3-3-3 3-3zM20 9l3 3-3 3-3-3 3-3z" />
      </svg>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const onCreate = pathname?.startsWith("/create");
  const onMe = pathname?.startsWith("/me");

  const navItem = (active: boolean) =>
    active
      ? "rounded-full bg-white/[0.08] px-4 py-2 text-[14px] font-semibold text-ink"
      : "rounded-full px-4 py-2 text-[14px] font-medium text-muted hover:text-ink";

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 rounded-full border border-line bg-surface px-3 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2.5 pl-2">
          <SvMark />
          <span className="text-[18px] font-bold tracking-[-0.01em]">SealedVerdict</span>
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/" className={navItem(!onCreate && !onMe)}>
            Bounties
          </Link>
          <Link href="/create" className={navItem(!!onCreate)}>
            Post a bounty
          </Link>
          <Link href="/me" className={navItem(!!onMe)}>
            Activity
          </Link>
        </div>

        <WalletChip />
      </div>
    </header>
  );
}
