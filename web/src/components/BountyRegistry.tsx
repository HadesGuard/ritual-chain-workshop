"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import {
  parseBounty,
  getBountyStatus,
  revealDeadline,
  type BountyStatus,
} from "@/lib/bounty";
import { formatReward, formatRelative, shortenAddress } from "@/lib/format";
import { useNow } from "@/hooks/useNow";

const PHASE: Record<BountyStatus, { label: string; cls: string }> = {
  open: { label: "Sealing", cls: "bg-indigo text-indigo-tint" },
  reveal: { label: "Reveal", cls: "bg-green text-green-tint" },
  ready: { label: "Judging", cls: "bg-amber-tint text-amber-text border border-amber" },
  judged: { label: "Judging", cls: "bg-amber-tint text-amber-text border border-amber" },
  finalized: { label: "Settled", cls: "bg-line text-text2" },
};

export function BountyRegistry({ onOpen }: { onOpen: (id: bigint) => void }) {
  const [query, setQuery] = useState("");

  const { data: nextId } = useReadContract({
    address: contractAddress,
    abi: sealedVerdictAbi,
    functionName: "nextBountyId",
    chainId: ritualChain.id,
    query: { enabled: !!contractAddress },
  });

  const next = nextId ? Number(nextId) : 1;
  const ids: number[] = [];
  for (let i = next - 1; i >= 1 && ids.length < 8; i--) ids.push(i);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const t = query.trim();
    if (!t) return;
    try {
      const id = BigInt(t);
      if (id >= 0n) onOpen(id);
    } catch {
      /* ignore non-numeric */
    }
  }

  return (
    <>
      <div className="mb-4 mt-[48px] flex items-baseline justify-between">
        <h2 className="m-0 text-[28px] font-medium tracking-[-0.01em]">Open bounties</h2>
        <form
          onSubmit={submitSearch}
          className="flex items-center rounded-[14px] border border-line bg-surface"
        >
          <span className="flex items-center px-3 py-2 text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by bounty ID…"
            className="w-[260px] max-w-[46vw] bg-transparent py-2 pr-3.5 font-mono text-[12px] text-ink outline-none placeholder:text-muted"
          />
        </form>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <div className="grid grid-cols-[2.4fr_1fr_1fr_1.1fr_0.6fr] bg-panel font-mono text-[10px] uppercase tracking-[0.14em] text-indigo-soft">
          <div className="px-[22px] py-[11px]">Bounty</div>
          <div className="px-3 py-[11px]">Phase</div>
          <div className="px-3 py-[11px]">Reward</div>
          <div className="px-3 py-[11px]">Closes in</div>
          <div className="px-[22px] py-[11px] text-right">Entries</div>
        </div>

        {ids.length === 0 ? (
          <div className="px-[22px] py-[46px] text-center">
            <div className="text-[18px] font-semibold">No bounties yet</div>
            <p className="mx-auto mt-1.5 max-w-[40ch] text-[13px] text-muted">
              Post the first one. Every entry stays sealed until the deadline.
            </p>
          </div>
        ) : (
          ids.map((id) => <RegistryRow key={id} id={BigInt(id)} onOpen={onOpen} />)
        )}
      </div>
    </>
  );
}

function RegistryRow({ id, onOpen }: { id: bigint; onOpen: (id: bigint) => void }) {
  const now = useNow();
  const { data } = useReadContract({
    address: contractAddress,
    abi: sealedVerdictAbi,
    functionName: "getBounty",
    args: [id],
    chainId: ritualChain.id,
    query: { enabled: !!contractAddress },
  });

  if (!data) {
    return (
      <div className="grid grid-cols-[2.4fr_1fr_1fr_1.1fr_0.6fr] border-t border-line">
        <div className="px-[22px] py-4">
          <span className="inline-block h-4 w-40 animate-pulse rounded bg-line" />
        </div>
        <div />
        <div />
        <div />
        <div />
      </div>
    );
  }

  const b = parseBounty(data as never);
  if (/^0x0+$/.test(b.owner)) return null;

  const status = getBountyStatus(b, now / 1000);
  const ph = PHASE[status];
  const closes =
    status === "open"
      ? formatRelative(b.deadline)
      : status === "reveal"
        ? formatRelative(revealDeadline(b))
        : "—";

  return (
    <button
      onClick={() => onOpen(id)}
      className="grid w-full grid-cols-[2.4fr_1fr_1fr_1.1fr_0.6fr] border-t border-line text-left transition hover:bg-bg"
    >
      <div className="px-[22px] py-4">
        <div className="mb-1 text-[18px] font-medium">{b.title || "Untitled"}</div>
        <div className="font-mono text-[10.5px] tracking-[0.04em] text-muted">
          Case №{id.toString()} · by {shortenAddress(b.owner)}
        </div>
      </div>
      <div className="flex items-center px-3 py-4">
        <span className={`px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] ${ph.cls}`}>
          {ph.label}
        </span>
      </div>
      <div className="flex items-center px-3 py-4 font-mono text-[14px] font-semibold text-green">
        {formatReward(b.reward)}
      </div>
      <div className="flex items-center px-3 py-4 font-mono text-[13px] text-text2">
        {closes}
      </div>
      <div className="flex items-center justify-end px-[22px] py-4 font-mono text-[14px] font-semibold">
        {b.submissionCount.toString()}
      </div>
    </button>
  );
}
