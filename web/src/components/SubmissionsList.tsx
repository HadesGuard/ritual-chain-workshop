"use client";

import { useAccount, useReadContract } from "wagmi";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { shortenAddress, isAddressEqual } from "@/lib/format";
import type { JudgeResult } from "@/lib/aiReview";
import { SkeletonBar } from "@/components/ui";

export function SubmissionsList({
  bountyId,
  count,
  judge,
  finalWinner,
}: {
  bountyId: bigint;
  count: number;
  judge?: JudgeResult | null;
  finalWinner?: number;
}) {
  const indices = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="flex items-baseline justify-between border-b-[1.5px] border-line px-6 py-[15px]">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Entries</span>
        <span className="font-mono text-[11px] text-muted">{count} total</span>
      </div>
      {count === 0 ? (
        <div className="px-6 py-[52px] text-center">
          <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-bg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8a94a6" strokeWidth="1.8">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <div className="mb-1 text-[18px] font-semibold">No submissions yet</div>
          <div className="mx-auto max-w-[36ch] text-[13px] leading-[1.5] text-muted">
            Be the first to answer. Every entry is sealed, so nobody can see what others wrote
            until the reveal.
          </div>
        </div>
      ) : (
        indices.map((i) => (
          <Row
            key={i}
            bountyId={bountyId}
            index={i}
            ranking={judge?.ranking?.find((r) => r.index === i)}
            isWinner={finalWinner === i}
          />
        ))
      )}
    </div>
  );
}

function Row({
  bountyId,
  index,
  ranking,
  isWinner,
}: {
  bountyId: bigint;
  index: number;
  ranking?: { index: number; score: number; reason: string };
  isWinner?: boolean;
}) {
  const { address } = useAccount();
  const { data, isLoading } = useReadContract({
    address: contractAddress,
    abi: sealedVerdictAbi,
    functionName: "getSubmission",
    args: [bountyId, BigInt(index)],
    chainId: ritualChain.id,
    query: { enabled: !!contractAddress },
  });

  const submitter = data?.[0];
  const commitment = data?.[1];
  const answer = data?.[2];
  const revealed = data?.[3];
  const mine = isAddressEqual(address, submitter);

  const status = isWinner
    ? { label: "Winner", cls: "bg-green text-green-tint" }
    : revealed
      ? { label: "Revealed", cls: "bg-line text-text2" }
      : { label: "Sealed", cls: "bg-indigo text-indigo-tint" };

  const rowBg = isWinner ? "bg-green-tint" : mine ? "bg-[#eef3fb]" : "bg-surface";

  return (
    <div className={`border-b-[1.5px] border-line ${rowBg}`}>
      <div className="flex items-start justify-between gap-4 px-6 py-4">
        <div className="flex items-start gap-3.5">
          <span className="pt-0.5 font-mono text-[12px] text-muted">
            {String(index).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-[17px] font-medium">
                {submitter ? shortenAddress(submitter) : isLoading ? "…" : "-"}
              </span>
              <span className={`px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] ${status.cls}`}>
                {status.label}
              </span>
            </div>
            {commitment ? (
              <div className="mt-1 font-mono text-[10.5px] text-muted">
                commit {shortenAddress(commitment, 8)}
              </div>
            ) : null}

            {isLoading ? (
              <SkeletonBar className="mt-3 h-3 w-[24ch]" />
            ) : revealed ? (
              <div className="mt-3 max-w-[60ch] whitespace-pre-wrap break-words text-[14px] leading-[1.6] text-text3">
                {answer}
              </div>
            ) : (
              <div className="mt-3 flex max-w-[52ch] items-center gap-2.5 border border-dashed border-[#dcdafb] bg-indigo-tint px-3.5 py-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5b54e6" strokeWidth="2">
                  <rect x="4" y="10" width="16" height="11" rx="1" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <span className="font-mono text-[12.5px] text-indigo-deep">
                  Sealed — contents hidden until reveal
                </span>
              </div>
            )}

            {revealed && ranking?.reason ? (
              <div className="mt-3 max-w-[60ch] border-l-2 border-indigo bg-bg px-3.5 py-2.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-indigo">
                  AI note
                </span>
                <div className="mt-1.5 text-[13px] italic leading-[1.55] text-text2">
                  {ranking.reason}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {revealed && ranking ? (
          <div className="shrink-0 text-right">
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Score</div>
            <div className="font-mono text-[24px] font-semibold text-green">{ranking.score}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
