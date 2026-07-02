"use client";

import { useReadContract } from "wagmi";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { shortenAddress } from "@/lib/format";
import type { JudgeResult } from "@/lib/aiReview";
import { Badge, CopyText, SkeletonBar } from "@/components/ui";

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

  if (count === 0) {
    return (
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
          No exhibits
        </div>
        <p className="mt-2 font-serif text-[18px] text-paper">
          Commitments appear here as they are filed.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Column heads */}
      <div className="grid grid-cols-[3rem_1fr_5rem] gap-4 border-b border-rule pb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-stone sm:grid-cols-[4rem_9rem_1fr_5rem]">
        <span>Exh.</span>
        <span className="hidden sm:block">Submitter</span>
        <span>Content</span>
        <span className="text-right">Score</span>
      </div>
      {indices.map((i) => (
        <SubmissionRow
          key={i}
          bountyId={bountyId}
          index={i}
          ranking={judge?.ranking?.find((r) => r.index === i)}
          recommended={judge?.winnerIndex === i}
          isWinner={finalWinner === i}
        />
      ))}
    </div>
  );
}

function SubmissionRow({
  bountyId,
  index,
  ranking,
  recommended,
  isWinner,
}: {
  bountyId: bigint;
  index: number;
  ranking?: { index: number; score: number; reason: string };
  recommended?: boolean;
  isWinner?: boolean;
}) {
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

  return (
    <div
      className={`grid grid-cols-[3rem_1fr_5rem] items-start gap-4 border-t border-rule py-3 transition-colors sm:grid-cols-[4rem_9rem_1fr_5rem] ${
        isWinner ? "bg-emerald/[0.08]" : "hover:bg-paper/[0.04]"
      }`}
    >
      <div className="font-mono text-[13px] text-stone">
        {String(index).padStart(2, "0")}
      </div>

      <div className="hidden font-mono text-[13px] text-paper sm:block">
        {submitter ? (
          <CopyText
            value={submitter}
            display={shortenAddress(submitter)}
            className="text-[13px] text-paper"
          />
        ) : isLoading ? (
          <SkeletonBar className="h-3 w-[11ch]" />
        ) : (
          "-"
        )}
      </div>

      <div className="min-w-0">
        {isLoading ? (
          <SkeletonBar className="h-3 w-[24ch]" />
        ) : revealed ? (
          <p className="animate-seal-open whitespace-pre-wrap break-words text-[14px] leading-snug text-paper">
            {answer}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-all bg-well px-2 py-1 font-mono text-[12px] text-stone">
              {commitment}
            </span>
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {revealed === false ? (
            <Badge tone="amber" className="rotate-[-1.5deg]">
              Sealed
            </Badge>
          ) : revealed ? (
            <Badge tone="zinc">Revealed</Badge>
          ) : null}
          {recommended ? <Badge tone="indigo">AI pick</Badge> : null}
          {isWinner ? <Badge tone="green">Judgment</Badge> : null}
        </div>
        {ranking?.reason ? (
          <p className="mt-2 border-t border-rule pt-2 text-[13px] text-stone">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
              Model note{" "}
            </span>
            {ranking.reason}
          </p>
        ) : null}
      </div>

      <div className="text-right font-mono text-[13px] text-emerald-bright">
        {ranking ? ranking.score : ""}
      </div>
    </div>
  );
}
