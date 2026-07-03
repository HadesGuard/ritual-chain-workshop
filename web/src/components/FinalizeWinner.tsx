"use client";

import { useState } from "react";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import type { Bounty } from "@/lib/bounty";
import { decodeAiReview } from "@/lib/aiReview";
import { formatReward } from "@/lib/format";
import { useWriteTx } from "@/hooks/useWriteTx";
import { TxStatus } from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

export function FinalizeWinner({
  bountyId,
  bounty,
  isOwner,
  onFinalized,
}: {
  bountyId: bigint;
  bounty: Bounty;
  isOwner: boolean;
  onFinalized: () => void;
}) {
  const count = Number(bounty.submissionCount);
  const recommended = decodeAiReview(bounty.aiReview)?.parsed?.winnerIndex;
  const [override, setOverride] = useState<string | null>(null);
  const winnerIndex = override ?? (recommended !== undefined ? String(recommended) : "");
  const tx = useWriteTx(() => onFinalized());

  if (!isOwner || !bounty.judged || bounty.finalized) return null;

  const idxNum = Number(winnerIndex);
  const valid =
    winnerIndex !== "" && Number.isInteger(idxNum) && idxNum >= 0 && idxNum < count;

  async function handleFinalize() {
    if (!valid || !contractAddress) return;
    try {
      await tx.run({
        address: contractAddress,
        abi: sealedVerdictAbi,
        functionName: "finalizeWinner",
        args: [bountyId, BigInt(idxNum)],
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced via tx.state */
    }
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="px-6 pb-4 pt-[22px]">
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-indigo">
          Finalize · you have the gavel
        </div>
        <div className="text-[22px] font-semibold">Choose the winner</div>
        <div className="mt-1.5 text-[13px] leading-[1.5] text-text2">
          {recommended !== undefined ? (
            <>
              The AI recommends entry <b>#{recommended}</b>. You can accept it or override — the
              contract pays whoever you finalize.
            </>
          ) : (
            <>Enter the winning entry index. The contract pays whoever you finalize.</>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4 border-t border-line px-6 py-5">
        <label className="block">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Winner index (0 to {Math.max(count - 1, 0)})
          </span>
          <input
            type="number"
            min={0}
            max={Math.max(count - 1, 0)}
            value={winnerIndex}
            onChange={(e) => setOverride(e.target.value)}
            className="w-28 rounded-[12px] border border-line bg-surface px-4 py-3 font-mono text-[16px] outline-none focus:border-indigo"
          />
        </label>
        <button
          onClick={handleFinalize}
          disabled={!valid || tx.isBusy}
          className="rounded-[12px] border border-green-deep bg-green px-6 py-3.5 text-[14px] font-semibold text-green-tint disabled:opacity-50"
        >
          {tx.isBusy ? "Paying…" : `Pay winner · ${formatReward(bounty.reward)}`}
        </button>
      </div>
      <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
    </div>
  );
}
