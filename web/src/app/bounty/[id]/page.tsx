"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { BountyView } from "@/components/BountyView";
import { useRecentBounties } from "@/hooks/useRecentBounties";
import { Notice } from "@/components/ui";

export default function BountyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  let bountyId: bigint | null = null;
  try {
    const parsed = BigInt(id);
    if (parsed >= 0n) bountyId = parsed;
  } catch {
    /* non-numeric id — render the invalid state below */
  }

  const { add } = useRecentBounties();
  useEffect(() => {
    if (bountyId !== null) add(bountyId);
  }, [bountyId, add]);

  return (
    <main className="mx-auto max-w-[1120px] px-5 sm:px-10">
      {/* Docket line */}
      <div className="flex items-center justify-between border-b border-rule py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
        <Link href="/" className="transition-colors hover:text-paper">
          ← Docket
        </Link>
        {bountyId !== null && <span>No. {bountyId.toString()}</span>}
      </div>

      <div className="pt-8">
        {bountyId === null ? (
          <Notice tone="amber">&ldquo;{id}&rdquo; is not a valid bounty id.</Notice>
        ) : (
          <BountyView bountyId={bountyId} />
        )}
      </div>
    </main>
  );
}
