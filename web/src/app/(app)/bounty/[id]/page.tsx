"use client";

import { use } from "react";
import { BountyView } from "@/components/BountyView";
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
    /* invalid id */
  }

  return (
    <main className="mx-auto max-w-[1180px] px-[26px] pb-[130px]">
      {bountyId === null ? (
        <div className="pt-10">
          <Notice tone="amber">&ldquo;{id}&rdquo; is not a valid bounty id.</Notice>
        </div>
      ) : (
        <BountyView bountyId={bountyId} />
      )}
    </main>
  );
}
