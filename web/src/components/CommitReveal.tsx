"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import type { Hex } from "viem";
import { useNow } from "@/hooks/useNow";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { canCommit, canReveal, type Bounty } from "@/lib/bounty";
import {
  computeCommitment,
  randomSalt,
  saveCommitment,
  loadCommitment,
  clearCommitment,
} from "@/lib/commitment";
import { useWriteTx } from "@/hooks/useWriteTx";
import {
  Card,
  CardHeader,
  CardBody,
  Field,
  Textarea,
  Button,
  TxStatus,
  Notice,
} from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

/**
 * Participant side of the commit-reveal flow.
 *
 * Commit phase: hash the answer with a fresh salt client-side and submit only
 * the hash. Reveal phase: send the answer + salt so the contract can verify
 * them against the stored commitment.
 */
export function CommitReveal({
  bountyId,
  bounty,
  onSubmitted,
}: {
  bountyId: bigint;
  bounty: Bounty;
  onSubmitted: () => void;
}) {
  const now = useNow();
  const { address } = useAccount();
  if (canCommit(bounty, now / 1000)) {
    return <CommitCard bountyId={bountyId} onSubmitted={onSubmitted} />;
  }
  if (canReveal(bounty, now / 1000)) {
    // Keyed by wallet so a wallet switch re-reads that wallet's saved entry.
    return (
      <RevealCard
        key={address ?? "disconnected"}
        bountyId={bountyId}
        onSubmitted={onSubmitted}
      />
    );
  }
  return null;
}

function CommitCard({
  bountyId,
  onSubmitted,
}: {
  bountyId: bigint;
  onSubmitted: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [answer, setAnswer] = useState("");
  const tx = useWriteTx(() => {
    setAnswer("");
    onSubmitted();
  });

  async function handleCommit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || !contractAddress || !address) return;
    const finalAnswer = answer.trim();
    const salt = randomSalt();
    const commitment = computeCommitment(finalAnswer, salt, address, bountyId);
    // Persist before broadcasting: once the tx is out, this salt is the only
    // way to ever reveal.
    saveCommitment(contractAddress, bountyId, address, {
      answer: finalAnswer,
      salt,
    });
    try {
      await tx.run({
        address: contractAddress,
        abi: sealedVerdictAbi,
        functionName: "submitCommitment",
        args: [bountyId, commitment],
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced via tx.state */
    }
  }

  return (
    <Card>
      <CardHeader
        title="Submit a sealed answer"
        subtitle="Only a hash goes on-chain now. Come back after the deadline to reveal."
      />
      <CardBody>
        <form onSubmit={handleCommit} className="space-y-3">
          <Field label="Your answer (stays on this device)">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              placeholder="Write your submission…"
            />
          </Field>
          <Notice tone="indigo">
            The answer and a random salt are stored in this browser. You must
            return during the 24h reveal window, from this browser and wallet,
            or your entry cannot be judged.
          </Notice>
          <Button
            type="submit"
            disabled={!isConnected || !answer.trim() || tx.isBusy}
            className="w-full"
          >
            {tx.isBusy ? "Committing…" : "Commit sealed answer"}
          </Button>
          {!isConnected && (
            <p className="text-xs text-zinc-500">Connect your wallet to submit.</p>
          )}
          <TxStatus
            state={tx.state}
            error={tx.error}
            hash={tx.hash}
            explorerBase={explorerBase}
          />
        </form>
      </CardBody>
    </Card>
  );
}

function RevealCard({
  bountyId,
  onSubmitted,
}: {
  bountyId: bigint;
  onSubmitted: () => void;
}) {
  const { address, isConnected } = useAccount();
  // Restore this wallet's saved answer + salt as the initial form state. The
  // parent remounts this card (key) when the wallet changes, so lazy
  // initialization is enough.
  const [restored] = useState(() =>
    contractAddress && address
      ? loadCommitment(contractAddress, bountyId, address)
      : null,
  );
  const [answer, setAnswer] = useState(restored?.answer ?? "");
  const [salt, setSalt] = useState<string>(restored?.salt ?? "");
  const tx = useWriteTx(() => {
    if (contractAddress && address) {
      clearCommitment(contractAddress, bountyId, address);
    }
    onSubmitted();
  });

  const saltValid = /^0x[0-9a-fA-F]{64}$/.test(salt);

  async function handleReveal(e: React.FormEvent) {
    e.preventDefault();
    if (!answer || !saltValid || !contractAddress) return;
    try {
      await tx.run({
        address: contractAddress,
        abi: sealedVerdictAbi,
        functionName: "revealAnswer",
        args: [bountyId, answer, salt as Hex],
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced via tx.state */
    }
  }

  return (
    <Card>
      <CardHeader
        title="Reveal your answer"
        subtitle="The contract verifies your answer + salt against your commitment."
      />
      <CardBody>
        <form onSubmit={handleReveal} className="space-y-3">
          {restored ? (
            <Notice tone="green">
              Restored your sealed answer from this browser. Review and reveal.
            </Notice>
          ) : (
            <Notice tone="amber">
              No saved entry found here. Paste the exact answer and salt you
              committed with (a different browser or wallet won&apos;t have them).
            </Notice>
          )}
          <Field label="Answer (exactly as committed)">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              placeholder="The answer you committed…"
            />
          </Field>
          <Field label="Salt (0x + 64 hex chars)">
            <Textarea
              value={salt}
              onChange={(e) => setSalt(e.target.value.trim())}
              rows={2}
              placeholder="0x…"
            />
          </Field>
          <Button
            type="submit"
            disabled={!isConnected || !answer || !saltValid || tx.isBusy}
            className="w-full"
          >
            {tx.isBusy ? "Revealing…" : "Reveal answer"}
          </Button>
          {!isConnected && (
            <p className="text-xs text-zinc-500">Connect your wallet to reveal.</p>
          )}
          <TxStatus
            state={tx.state}
            error={tx.error}
            hash={tx.hash}
            explorerBase={explorerBase}
          />
        </form>
      </CardBody>
    </Card>
  );
}
