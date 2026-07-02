"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { contractAddress, executorAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { revealDeadline, type Bounty } from "@/lib/bounty";
import { useNow } from "@/hooks/useNow";
import { buildJudgeAllLlmInput, type JudgeSubmission } from "@/lib/ritualLlm";
import { useWriteTx } from "@/hooks/useWriteTx";
import { useRitualWalletStatus } from "@/hooks/useRitualWalletStatus";
import { RitualWalletPanel } from "@/components/RitualWalletPanel";
import { Card, CardHeader, CardBody, Button, TxStatus, Notice, Spinner } from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

export function JudgeAll({
  bountyId,
  bounty,
  isOwner,
  onJudged,
}: {
  bountyId: bigint;
  bounty: Bounty;
  isOwner: boolean;
  onJudged: () => void;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: ritualChain.id });
  const [gathering, setGathering] = useState(false);
  const [gatherError, setGatherError] = useState<string | null>(null);
  const tx = useWriteTx(() => onJudged());

  // Preflight the *connected* wallet's RitualWallet funding (not the bounty
  // contract) — judgeAll spends prepaid+locked RITUAL via the LLM precompile.
  const walletStatus = useRitualWalletStatus(address);

  const now = useNow();
  const count = Number(bounty.submissionCount);
  const revealOver = now / 1000 >= Number(revealDeadline(bounty));

  // Gate per spec: owner only, has submissions, reveal window closed, not yet
  // judged. The contract enforces all of this too; we just avoid dead UI.
  if (!isOwner || bounty.judged || bounty.finalized || count === 0 || !revealOver) {
    return null;
  }

  async function handleJudge() {
    if (!publicClient || !contractAddress || !walletStatus.ready) return;
    setGatherError(null);
    setGathering(true);
    try {
      // 1–2. Load every *revealed* submission; sealed ones are not eligible.
      const [indexes, submitters, answers] = await publicClient.readContract({
        address: contractAddress,
        abi: sealedVerdictAbi,
        functionName: "getRevealedAnswers",
        args: [bountyId],
      });
      if (indexes.length === 0) {
        throw new Error("No revealed answers to judge.");
      }
      const submissions: JudgeSubmission[] = indexes.map((idx, j) => ({
        index: Number(idx),
        submitter: submitters[j],
        answer: answers[j],
      }));

      // 3–4. Build the batch judging prompt and encode the Ritual LLM request.
      const llmInput = buildJudgeAllLlmInput({
        executorAddress,
        title: bounty.title,
        rubric: bounty.rubric,
        submissions,
      });

      setGathering(false);

      // 5. Submit it on-chain.
      await tx.run({
        address: contractAddress,
        abi: sealedVerdictAbi,
        functionName: "judgeAll",
        args: [bountyId, llmInput],
        chainId: ritualChain.id,
      });
    } catch (e) {
      setGathering(false);
      setGatherError(
        (e as { shortMessage?: string; message?: string }).shortMessage ||
          (e as Error).message ||
          "Failed to gather submissions.",
      );
    }
  }

  const busy = gathering || tx.isBusy;
  const fundingReady = walletStatus.ready === true;

  return (
    <Card>
      <CardHeader
        title="Judge all revealed answers"
        subtitle="Sends one Ritual LLM request ranking every revealed submission."
      />
      <CardBody className="space-y-3">
        <Notice tone="indigo">AI review is advisory. The bounty owner finalizes the winner.</Notice>

        <RitualWalletPanel status={walletStatus} onDeposited={walletStatus.refetch} />

        <Button onClick={handleJudge} disabled={busy || !fundingReady} className="w-full">
          {gathering ? (
            <>
              <Spinner /> Gathering revealed answers…
            </>
          ) : tx.isBusy ? (
            "Judging…"
          ) : !fundingReady ? (
            "Fund RitualWallet to judge"
          ) : (
            "Judge revealed answers"
          )}
        </Button>
        {gatherError && <Notice tone="red">{gatherError}</Notice>}
        <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
      </CardBody>
    </Card>
  );
}
