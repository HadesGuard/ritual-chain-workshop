"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useBounty } from "@/hooks/useBounty";
import { useNow } from "@/hooks/useNow";
import {
  getBountyStatus,
  revealDeadline,
  type Bounty,
  type BountyStatus,
} from "@/lib/bounty";
import {
  shortenAddress,
  isAddressEqual,
  formatReward,
  formatTimestamp,
} from "@/lib/format";
import { decodeAiReview } from "@/lib/aiReview";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { useWriteTx } from "@/hooks/useWriteTx";
import { CommitReveal } from "@/components/CommitReveal";
import { JudgeAll } from "@/components/JudgeAll";
import { FinalizeWinner } from "@/components/FinalizeWinner";
import { AIReviewDisplay } from "@/components/AIReviewDisplay";
import { SubmissionsList } from "@/components/SubmissionsList";
import { CopyText, SkeletonBar } from "@/components/ui";

const PHASE_BADGE: Record<BountyStatus, { label: string; cls: string }> = {
  open: { label: "Sealing", cls: "bg-indigo text-indigo-tint" },
  reveal: { label: "Reveal", cls: "bg-green text-green-tint" },
  ready: { label: "Judging", cls: "bg-amber-tint text-amber-text border border-amber" },
  judged: { label: "Judging", cls: "bg-amber-tint text-amber-text border border-amber" },
  finalized: { label: "Settled", cls: "bg-green text-green-tint" },
};

const STEPS = ["Seal", "Reveal", "Judge", "Settle"];
function stepIndex(s: BountyStatus): number {
  if (s === "open") return 0;
  if (s === "reveal") return 1;
  if (s === "ready" || s === "judged") return 2;
  return 3;
}

export function BountyView({ bountyId }: { bountyId: bigint }) {
  const { address } = useAccount();
  const now = useNow();
  const { bounty, isLoading, isError, refetch } = useBounty(bountyId);
  const reload = useCallback(() => void refetch(), [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonBar className="h-10 w-2/3" />
        <SkeletonBar className="h-40 w-full rounded-[14px]" />
      </div>
    );
  }
  if (isError || !bounty) {
    return (
      <div className="rounded-[14px] border border-red-soft bg-red-tint px-5 py-4 text-[14px] text-wax">
        Could not load bounty #{bountyId.toString()}. Check the id and RPC.
      </div>
    );
  }
  if (/^0x0+$/.test(bounty.owner)) {
    return (
      <div className="py-20 text-center">
        <div className="text-[120px] font-medium leading-none text-ink opacity-[0.13]">404</div>
        <div className="-mt-8 text-[28px] font-medium">Bounty not found</div>
        <div className="mx-auto mt-3 max-w-[40ch] text-[14px] leading-[1.55] text-text2">
          Bounty <span className="font-mono text-indigo">#{bountyId.toString()}</span> doesn’t
          exist, or was never funded on this network.
        </div>
        <Link
          href="/"
          className="mt-6 inline-block rounded-[14px] bg-panel px-6 py-3.5 text-[14px] font-semibold text-indigo-tint2"
        >
          ← Back to bounties
        </Link>
      </div>
    );
  }

  const isOwner = isAddressEqual(address, bounty.owner);
  const judge = decodeAiReview(bounty.aiReview)?.parsed ?? null;
  const status = getBountyStatus(bounty, now / 1000);
  const badge = PHASE_BADGE[status];
  const reached = stepIndex(status);

  return (
    <>
      {/* breadcrumb */}
      <div className="flex items-center gap-3.5 pb-[18px] pt-[26px]">
        <Link href="/" className="font-mono text-[11px] text-muted hover:text-ink">
          ← registry
        </Link>
        <span className="font-mono text-[11px] text-line">/</span>
        <span className="font-mono text-[11px] tracking-[0.06em] text-muted">
          Case №{bountyId.toString()}
        </span>
      </div>

      {/* MASTHEAD */}
      <div className="grid grid-cols-1 rounded-[14px] border border-line lg:grid-cols-[1.55fr_1fr]">
        <div className="border-r-[1.5px] border-line px-9 py-[34px]">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <span className={`px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] ${badge.cls}`}>
              ● {badge.label}
            </span>
          </div>
          <h1 className="m-0 mb-5 max-w-[20ch] text-[40px] font-medium leading-[1.08] tracking-[-0.015em]">
            {bounty.title || "Untitled bounty"}
          </h1>
          <div className="flex flex-wrap items-center gap-[22px]">
            <div className="leading-[1.1]">
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Organizer</div>
              <div className="font-mono text-[13px] font-medium">{shortenAddress(bounty.owner)}</div>
            </div>
            <div className="h-[30px] w-px bg-line" />
            <div className="leading-[1.1]">
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Entries</div>
              <div className="font-mono text-[13px] font-medium">{bounty.submissionCount.toString()} total</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-[14px] bg-panel px-[30px] py-7 text-on-panel-soft">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-indigo-soft">
            Reward in escrow
          </div>
          <div className="font-mono text-[40px] font-semibold leading-none text-green-bright">
            {formatReward(bounty.reward)}
          </div>
          <div className="mt-4 flex border-t border-panel-line pt-4">
            <div className="flex-1 border-r border-panel-line pr-3.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">Seal deadline</div>
              <div className="mt-1.5 font-mono text-[12px] text-on-panel">{formatTimestamp(bounty.deadline)}</div>
            </div>
            <div className="flex-1 pl-3.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">Reveal closes</div>
              <div className="mt-1.5 font-mono text-[12px] text-on-panel">{formatTimestamp(revealDeadline(bounty))}</div>
            </div>
          </div>
        </div>
      </div>

      {/* PHASE TIMELINE */}
      <div className="flex flex-wrap items-center gap-3 border-b-[1.5px] border-l-[1.5px] border-r-[1.5px] border-line bg-surface px-[22px] py-[18px]">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            <div className="flex items-center gap-[9px]">
              <div
                className={`h-2.5 w-2.5 rounded-full ${i <= reached ? "bg-indigo" : "bg-line"}`}
              />
              <span
                className={`font-mono text-[11px] uppercase tracking-[0.08em] ${i <= reached ? "text-ink" : "text-muted"}`}
              >
                {String(i + 1).padStart(2, "0")} {label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <div className={`h-px w-8 ${i < reached ? "bg-indigo" : "bg-line"}`} />
            ) : null}
          </div>
        ))}
      </div>

      {/* TWO COLUMN */}
      <div className="mt-[30px] grid grid-cols-1 items-start gap-[26px] lg:grid-cols-[1.55fr_1fr]">
        {/* MAIN */}
        <div className="flex flex-col gap-[26px]">
          {bounty.finalized ? <SettledBanner bounty={bounty} winner={Number(bounty.winnerIndex)} /> : null}
          <CommitReveal bountyId={bountyId} bounty={bounty} onSubmitted={reload} />
          <JudgeAll bountyId={bountyId} bounty={bounty} isOwner={isOwner} onJudged={reload} />
          {bounty.judged ? <AIReviewDisplay aiReview={bounty.aiReview} /> : null}
          <FinalizeWinner bountyId={bountyId} bounty={bounty} isOwner={isOwner} onFinalized={reload} />
          <SubmissionsList
            bountyId={bountyId}
            count={Number(bounty.submissionCount)}
            judge={judge}
            finalWinner={bounty.finalized ? Number(bounty.winnerIndex) : undefined}
          />
        </div>

        {/* SIDEBAR */}
        <div className="sticky top-[88px] flex flex-col gap-[22px]">
          <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
            <div className="border-b-[1.5px] border-line px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.16em]">
              The rubric
            </div>
            <div className="whitespace-pre-wrap px-5 py-4 text-[13.5px] leading-[1.6] text-text3">
              {bounty.rubric || "No rubric provided."}
            </div>
          </div>

          <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
            <div className="border-b-[1.5px] border-line px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.16em]">
              Contract
            </div>
            <div className="flex flex-col gap-3 px-5 py-3.5">
              <FactRow label="Escrow" value={
                contractAddress ? (
                  <CopyText value={contractAddress} display={shortenAddress(contractAddress, 6)} className="text-[12.5px]" />
                ) : "—"
              } />
              <FactRow label="Locked" value={<span className="font-semibold text-green">{formatReward(bounty.reward)}</span>} />
              <FactRow label="Network" value={<span className="font-mono">{ritualChain.name}</span>} />
              <FactRow label="Owner" value={
                <CopyText value={bounty.owner} display={shortenAddress(bounty.owner)} className="text-[12.5px]" />
              } />
            </div>
          </div>

          {isOwner ? <OwnerControls bountyId={bountyId} bounty={bounty} status={status} now={now} onDone={reload} /> : null}
        </div>
      </div>
    </>
  );
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="font-mono text-[12.5px]">{value}</span>
    </div>
  );
}

function SettledBanner({ bounty, winner }: { bounty: Bounty; winner: number }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-green-deep bg-green-tint">
      <div className="flex items-center justify-between bg-green px-6 py-3.5 text-green-tint">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">● Settled · winner paid</span>
      </div>
      <div className="flex items-center gap-[22px] px-6 py-[26px]">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green text-green-tint">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e7f8f0" strokeWidth="2">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-green">
            Winner · paid automatically
          </div>
          <div className="text-[28px] font-medium">Entry #{winner}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] text-green">Payout</div>
          <div className="font-mono text-[34px] font-semibold text-green-deep">{formatReward(bounty.reward)}</div>
        </div>
      </div>
    </div>
  );
}

function OwnerControls({
  bountyId,
  bounty,
  status,
  now,
  onDone,
}: {
  bountyId: bigint;
  bounty: Bounty;
  status: BountyStatus;
  now: number;
  onDone: () => void;
}) {
  const tx = useWriteTx(() => onDone());
  const revealOver = now / 1000 >= Number(revealDeadline(bounty));
  const canReclaim = revealOver && !bounty.finalized;

  async function reclaim() {
    if (!contractAddress) return;
    try {
      await tx.run({
        address: contractAddress,
        abi: sealedVerdictAbi,
        functionName: "reclaimReward",
        args: [bountyId],
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced elsewhere */
    }
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-indigo-deep bg-panel text-on-panel-soft">
      <div className="flex items-center gap-2 border-b-[1.5px] border-panel-line px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-indigo-soft">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a5a1f2" strokeWidth="2">
          <rect x="4" y="10" width="16" height="11" rx="1" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        Organizer only
      </div>
      <div className="flex flex-col gap-2.5 px-5 py-4">
        {status === "open" || status === "reveal" ? (
          <div className="border-[1.5px] border-dashed border-[#2c3140] px-3 py-3 text-center font-mono text-[11px] text-muted">
            Judging unlocks after the reveal window
          </div>
        ) : null}
        {canReclaim ? (
          <button
            onClick={reclaim}
            disabled={tx.isBusy}
            className="border-[1.5px] border-[#3a2f45] px-3 py-2.5 text-center text-[12px] font-medium text-[#b8748a] disabled:opacity-50"
          >
            {tx.isBusy ? "…" : "Reclaim prize (no reveals)"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
