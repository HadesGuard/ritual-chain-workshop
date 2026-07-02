"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useBounty } from "@/hooks/useBounty";
import { isAddressEqual } from "@/lib/format";
import { decodeAiReview } from "@/lib/aiReview";
import { BountyDetail } from "@/components/BountyDetail";
import { CommitReveal } from "@/components/CommitReveal";
import { JudgeAll } from "@/components/JudgeAll";
import { FinalizeWinner } from "@/components/FinalizeWinner";
import { AIReviewDisplay } from "@/components/AIReviewDisplay";
import { SubmissionsList } from "@/components/SubmissionsList";
import { Notice, SkeletonBar } from "@/components/ui";

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-6">
      <div className="flex gap-4">
        <span className="font-mono text-[11px] tracking-[0.08em] text-stone">
          {index}
        </span>
        <h2 className="font-serif text-[21px] font-medium">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function BountyView({ bountyId }: { bountyId: bigint }) {
  const { address } = useAccount();
  const { bounty, isLoading, isError, refetch } = useBounty(bountyId);

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonBar className="h-8 w-2/5" />
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-3/5" />
        <div className="grid grid-cols-4 gap-4 pt-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBar key={i} className="h-10" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !bounty) {
    return (
      <div className="space-y-4">
        <Notice tone="red">
          Could not load No. {bountyId.toString()}. Check the id and that the
          contract address and RPC are configured.
        </Notice>
        <button
          onClick={reload}
          className="font-mono text-[12px] uppercase tracking-[0.08em] text-emerald-bright underline decoration-emerald-bright/40 underline-offset-4 hover:decoration-emerald-bright"
        >
          Retry →
        </button>
      </div>
    );
  }

  // owner == 0x0 means the bounty doesn't exist.
  if (/^0x0+$/.test(bounty.owner)) {
    return (
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
          No such entry
        </div>
        <p className="mt-2 font-serif text-[18px] text-paper">
          Docket No. {bountyId.toString()} has not been filed.
        </p>
        <Link
          href="/"
          className="mt-3 inline-block font-mono text-[12px] uppercase tracking-[0.08em] text-emerald-bright underline decoration-emerald-bright/40 underline-offset-4 hover:decoration-emerald-bright"
        >
          ← Return to docket
        </Link>
      </div>
    );
  }

  const isOwner = isAddressEqual(address, bounty.owner);
  const judge = decodeAiReview(bounty.aiReview)?.parsed ?? null;

  return (
    <div className="space-y-12">
      <BountyDetail bountyId={bountyId} bounty={bounty} isOwner={isOwner} />

      <Section index="01" title="Brief">
        <p className="max-w-[68ch] whitespace-pre-wrap break-words text-[15px] leading-[1.6] text-stone">
          {bounty.rubric || "No rubric provided."}
        </p>
      </Section>

      <Section index="02" title="Action">
        <div className="space-y-4">
          <CommitReveal bountyId={bountyId} bounty={bounty} onSubmitted={reload} />
          <JudgeAll
            bountyId={bountyId}
            bounty={bounty}
            isOwner={isOwner}
            onJudged={reload}
          />
          <FinalizeWinner
            bountyId={bountyId}
            bounty={bounty}
            isOwner={isOwner}
            onFinalized={reload}
          />
        </div>
      </Section>

      <Section index="03" title="Exhibits">
        <SubmissionsList
          bountyId={bountyId}
          count={Number(bounty.submissionCount)}
          judge={judge}
          finalWinner={bounty.finalized ? Number(bounty.winnerIndex) : undefined}
        />
      </Section>

      {bounty.judged && (
        <Section index="04" title="Memorandum">
          <AIReviewDisplay aiReview={bounty.aiReview} />
        </Section>
      )}
    </div>
  );
}
