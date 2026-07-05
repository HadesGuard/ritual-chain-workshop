"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import type { Hex } from "viem";
import { useNow } from "@/hooks/useNow";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { canCommit, canReveal, revealDeadline, type Bounty } from "@/lib/bounty";
import {
  computeCommitment,
  randomSalt,
  saveCommitment,
  loadCommitment,
  clearCommitment,
} from "@/lib/commitment";
import { useWriteTx } from "@/hooks/useWriteTx";
import { TxStatus } from "@/components/ui";
import { RevealOverlay } from "@/components/RevealOverlay";
import { shortenAddress } from "@/lib/format";

const explorerBase = ritualChain.blockExplorers?.default.url;

function countdown(targetSec: bigint, nowMs: number): string {
  if (!nowMs) return " ";
  let s = Math.floor((Number(targetSec) * 1000 - nowMs) / 1000);
  if (s <= 0) return "00:00:00";
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return (d > 0 ? d + "d " : "") + p(h) + ":" + p(m) + ":" + p(s);
}

export function CommitReveal({
  bountyId,
  bounty,
  onSubmitted,
}: {
  bountyId: bigint;
  bounty: Bounty;
  onSubmitted: () => void;
}) {
  const now = useNow(1000);
  const { address } = useAccount();
  if (canCommit(bounty, now / 1000)) {
    return <CommitCard bountyId={bountyId} bounty={bounty} onSubmitted={onSubmitted} />;
  }
  if (canReveal(bounty, now / 1000)) {
    return (
      <RevealCard
        key={address ?? "disconnected"}
        bountyId={bountyId}
        bounty={bounty}
        onSubmitted={onSubmitted}
      />
    );
  }
  return null;
}

function CommitCard({
  bountyId,
  bounty,
  onSubmitted,
}: {
  bountyId: bigint;
  bounty: Bounty;
  onSubmitted: () => void;
}) {
  const now = useNow(1000);
  const { address, isConnected } = useAccount();
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState<{ commit: Hex; salt: Hex } | null>(null);
  const tx = useWriteTx(() => {
    onSubmitted();
  });

  async function commit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || !contractAddress || !address) return;
    const finalAnswer = answer.trim();
    const salt = randomSalt();
    const commitment = computeCommitment(finalAnswer, salt, address, bountyId);
    saveCommitment(contractAddress, bountyId, address, { answer: finalAnswer, salt });
    setSaved({ commit: commitment, salt });
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

  const done = tx.state === "confirmed" && saved;

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="flex flex-col items-stretch border-b-[1.5px] border-line sm:flex-row">
        <div className="flex-1 px-5 py-[18px] sm:px-[26px] sm:py-[22px]">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-indigo">
            Sealing closes in
          </div>
          <div className="flex items-center gap-3">
            <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-indigo [animation:sv-tick_1s_steps(1)_infinite]" />
            <span className="font-mono text-[28px] font-semibold tracking-[0.02em] sm:text-[40px]">
              {countdown(bounty.deadline, now)}
            </span>
          </div>
        </div>
        <div className="flex w-full flex-col justify-center border-t-[1.5px] border-line bg-bg px-5 py-4 sm:w-[40%] sm:border-l-[1.5px] sm:border-t-0 sm:px-6 sm:py-[22px]">
          <div className="text-[12.5px] leading-[1.55] text-text2">
            Your answer is stored as a hash.{" "}
            <b>No one can read it, not even the organizer, until you unseal it after the deadline.</b>
          </div>
        </div>
      </div>

      {done ? (
        <div className="px-[26px] py-6">
          <div className="mb-[18px] flex items-center gap-[11px]">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-green-tint">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12946a" strokeWidth="2.2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div>
              <div className="text-[17px] font-semibold">Commitment submitted.</div>
              <div className="text-[12.5px] text-text2">
                Your answer is sealed. It stays hidden until you reveal after the deadline.
              </div>
            </div>
          </div>
          <div className="rounded-[14px] border-[1.5px] border-amber bg-amber-tint px-[18px] py-4">
            <div className="mb-3 flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b7791f" strokeWidth="2">
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-text">
                Save your salt, you need it to reveal
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between rounded-[10px] border border-line bg-surface px-3.5 py-2.5">
                <span className="font-mono text-[11px] text-muted">commitment</span>
                <span className="font-mono text-[12.5px]">{shortenAddress(saved!.commit, 8)}</span>
              </div>
              <div className="flex items-center justify-between rounded-[10px] border border-line bg-surface px-3.5 py-2.5">
                <span className="font-mono text-[11px] text-muted">salt</span>
                <span className="font-mono text-[12.5px]">{shortenAddress(saved!.salt, 8)}</span>
              </div>
            </div>
            <div className="mt-[11px] text-[11.5px] leading-[1.5] text-amber-text2">
              Lose the salt and you can’t prove the answer is yours. We saved a copy in this
              browser, but keep your own.
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={commit} className="px-[26px] py-6">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Your answer
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            placeholder="Write your answer. It is hashed on your device and only the hash is sent on-chain. The text stays with you until you reveal after the deadline."
            className="w-full resize-y rounded-[14px] border border-line bg-surface px-4 py-3.5 text-[14.5px] leading-[1.6] outline-none focus:border-indigo"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="10" width="16" height="11" rx="1" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              keccak256(answer, salt, you, id) · one entry per address
            </div>
            <button
              type="submit"
              disabled={!isConnected || !answer.trim() || tx.isBusy}
              className="rounded-[12px] bg-green px-[26px] py-3.5 text-[14px] font-semibold text-on-accent shadow-[0_0_28px_rgba(53,208,127,0.3)] disabled:opacity-50"
            >
              {tx.isBusy ? "Sealing…" : "Submit commitment →"}
            </button>
          </div>
          <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
        </form>
      )}
    </div>
  );
}

function RevealCard({
  bountyId,
  bounty,
  onSubmitted,
}: {
  bountyId: bigint;
  bounty: Bounty;
  onSubmitted: () => void;
}) {
  const now = useNow(1000);
  const { address, isConnected } = useAccount();
  const [restored] = useState(() =>
    contractAddress && address ? loadCommitment(contractAddress, bountyId, address) : null,
  );
  const [answer, setAnswer] = useState(restored?.answer ?? "");
  const [salt, setSalt] = useState<string>(restored?.salt ?? "");
  const [overlayDone, setOverlayDone] = useState(false);
  const tx = useWriteTx(() => {
    if (contractAddress && address) clearCommitment(contractAddress, bountyId, address);
  });

  const saltValid = /^0x[0-9a-fA-F]{64}$/.test(salt);
  const done = tx.state === "confirmed";

  async function reveal(e: React.FormEvent) {
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
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="flex items-center justify-between border-b-[1.5px] border-line px-5 py-[18px] sm:px-[26px] sm:py-[22px]">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-green">
            Reveal window closes in
          </div>
          <div className="flex items-center gap-[11px]">
            <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-green [animation:sv-tick_1s_steps(1)_infinite]" />
            <span className="font-mono text-[26px] font-semibold sm:text-[38px]">
              {countdown(revealDeadline(bounty), now)}
            </span>
          </div>
        </div>
      </div>

      {done && !overlayDone ? (
        <RevealOverlay
          answer={answer}
          onDone={() => {
            setOverlayDone(true);
            onSubmitted();
          }}
        />
      ) : null}

      {done ? (
        <div className="flex items-center gap-3.5 bg-green-tint px-[26px] py-6">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#12946a" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <div>
            <div className="text-[19px] font-medium">Unsealed. Your answer is now public.</div>
            <div className="mt-[3px] font-mono text-[12.5px] text-text2">
              The contract checked it matches what you first submitted.
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={reveal} className="px-[26px] py-6">
          <div className="mb-1 text-[20px] font-semibold">Unseal your answer</div>
          <div className="mb-[18px] text-[13px] leading-[1.5] text-text2">
            Paste back the exact answer and salt you saved. The contract recomputes the hash and
            checks it matches your commitment.
          </div>

          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Your answer
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            className="mb-3.5 w-full resize-y rounded-[14px] border border-line bg-surface px-4 py-3 text-[14px] leading-[1.55] outline-none focus:border-indigo"
          />

          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Your salt
          </div>
          <input
            value={salt}
            onChange={(e) => setSalt(e.target.value.trim())}
            placeholder="0x…"
            className="w-full rounded-[12px] border border-line bg-surface px-4 py-3 font-mono text-[13px] outline-none focus:border-indigo"
          />

          {!restored && (
            <div className="mt-3.5 flex items-center gap-2.5 rounded-[12px] border border-amber bg-amber-tint px-3.5 py-3 text-[12.5px] text-amber-text2">
              No saved salt on this device. Enter the exact answer and salt from commit time.
            </div>
          )}

          <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3.5">
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="10" width="16" height="11" rx="1" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              recomputed on-chain via keccak256
            </div>
            <button
              type="submit"
              disabled={!isConnected || !answer || !saltValid || tx.isBusy}
              className="whitespace-nowrap rounded-[12px] bg-panel px-[26px] py-3.5 text-[14px] font-semibold text-indigo-tint2 shadow-[0_0_28px_rgba(53,208,127,0.3)] disabled:opacity-50"
            >
              {tx.isBusy ? "Revealing…" : "Verify & reveal →"}
            </button>
          </div>
          <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
        </form>
      )}
    </div>
  );
}
