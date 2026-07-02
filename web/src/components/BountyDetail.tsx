"use client";

import type { Bounty } from "@/lib/bounty";
import { getBountyStatus, revealDeadline, STATUS_META } from "@/lib/bounty";
import { useNow } from "@/hooks/useNow";
import { shortenAddress, formatReward, formatTimestamp, formatRelative } from "@/lib/format";
import { Badge, CopyText } from "@/components/ui";
import { PhaseTimeline } from "@/components/PhaseTimeline";

function MetaCell({
  label,
  children,
  first,
}: {
  label: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div className={first ? "" : "sm:border-l sm:border-rule sm:pl-4"}>
      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
        {label}
      </div>
      <div className="mt-1 font-mono text-[13px] text-paper">{children}</div>
    </div>
  );
}

export function BountyDetail({
  bountyId,
  bounty,
  isOwner,
}: {
  bountyId: bigint;
  bounty: Bounty;
  isOwner: boolean;
}) {
  const now = useNow();
  const status = getBountyStatus(bounty, now / 1000);
  const meta = STATUS_META[status];
  const revealClose = revealDeadline(bounty);

  return (
    <div>
      {/* Case header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
            No. {bountyId.toString()}
          </div>
          <h1 className="mt-1 font-serif text-[30px] font-medium leading-tight">
            {bounty.title || "Untitled"}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {isOwner && <Badge tone="indigo">You own this entry</Badge>}
        </div>
      </div>

      {/* Meta ledger row */}
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-rule pt-4 sm:grid-cols-5">
        <MetaCell label="Reward" first>
          <span className="text-[15px]">{formatReward(bounty.reward)}</span>
        </MetaCell>
        <MetaCell label="Submissions">{bounty.submissionCount.toString()}</MetaCell>
        <MetaCell label="Commit deadline">
          {formatTimestamp(bounty.deadline)}
          <span className="mt-0.5 block text-[11px] text-stone">
            {formatRelative(bounty.deadline)}
          </span>
        </MetaCell>
        <MetaCell label="Reveal closes">
          {formatTimestamp(revealClose)}
          <span className="mt-0.5 block text-[11px] text-stone">
            {formatRelative(revealClose)}
          </span>
        </MetaCell>
        <MetaCell label="Owner">
          <CopyText
            value={bounty.owner}
            display={shortenAddress(bounty.owner)}
            className="text-[13px] text-paper"
          />
        </MetaCell>
      </div>

      {/* Phase timeline */}
      <div className="mt-8">
        <PhaseTimeline bounty={bounty} />
      </div>
    </div>
  );
}
