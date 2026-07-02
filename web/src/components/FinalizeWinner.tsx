"use client";

import { useState } from "react";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import type { Bounty } from "@/lib/bounty";
import { decodeAiReview } from "@/lib/aiReview";
import { formatReward } from "@/lib/format";
import { useWriteTx } from "@/hooks/useWriteTx";
import {
  Panel,
  PanelHeader,
  Field,
  Input,
  Button,
  TxStatus,
} from "@/components/ui";

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

  // The input is prefilled with the AI recommendation until the owner edits it.
  // `override === null` means "untouched, show the recommendation".
  const [override, setOverride] = useState<string | null>(null);
  const winnerIndex =
    override ?? (recommended !== undefined ? String(recommended) : "");

  const tx = useWriteTx(() => onFinalized());

  // Gate per spec: owner only, judged, not finalized.
  if (!isOwner || !bounty.judged || bounty.finalized) return null;

  const idxNum = Number(winnerIndex);
  const valid =
    winnerIndex !== "" &&
    Number.isInteger(idxNum) &&
    idxNum >= 0 &&
    idxNum < count;

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
    <Panel>
      <PanelHeader
        title="Enter judgment"
        subtitle={`Releases the reward (${formatReward(bounty.reward)}) to one exhibit.`}
      />
      <div className="space-y-3">
        {recommended !== undefined ? (
          <p className="font-serif text-[18px] leading-snug text-paper">
            The model recommends exhibit No. {recommended}.
          </p>
        ) : null}

        <Field
          label="Winner index"
          hint={
            recommended !== undefined
              ? "The recommendation is advisory. Judgment is yours."
              : `Choose an exhibit index (0 to ${Math.max(count - 1, 0)}).`
          }
        >
          <Input
            type="number"
            min={0}
            max={Math.max(count - 1, 0)}
            value={winnerIndex}
            onChange={(e) => setOverride(e.target.value)}
            className="font-mono"
          />
        </Field>

        {winnerIndex !== "" && !valid && (
          <p className="font-mono text-[12px] text-gilt">
            Index must be between 0 and {Math.max(count - 1, 0)}.
          </p>
        )}

        <Button
          onClick={handleFinalize}
          disabled={!valid || tx.isBusy}
          className="w-full"
        >
          {tx.isBusy ? "Entering judgment" : "Enter judgment →"}
        </Button>

        <TxStatus
          state={tx.state}
          error={tx.error}
          hash={tx.hash}
          explorerBase={explorerBase}
        />
      </div>
    </Panel>
  );
}
