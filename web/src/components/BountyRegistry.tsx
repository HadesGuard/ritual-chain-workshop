"use client";

import { useCallback, useEffect, useState } from "react";
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

export type RegistryFilter = "all" | "open" | "reveal" | "finalized";

const PHASE: Record<BountyStatus, { label: string; cls: string; dot: string }> = {
  open: { label: "Sealing", cls: "bg-indigo-tint text-indigo-soft", dot: "bg-indigo-soft" },
  reveal: { label: "Reveal", cls: "bg-green-tint text-green-bright", dot: "bg-green" },
  ready: { label: "Judging", cls: "bg-amber-tint text-amber-text", dot: "bg-amber" },
  judged: { label: "Judging", cls: "bg-amber-tint text-amber-text", dot: "bg-amber" },
  finalized: { label: "Settled", cls: "bg-white/[0.06] text-muted", dot: "bg-muted" },
};

export function BountyRegistry({
  filter = "all",
  owner,
  hideSearch = false,
  emptyText,
  onOpen,
}: {
  filter?: RegistryFilter;
  owner?: string;
  hideSearch?: boolean;
  emptyText?: string;
  onOpen: (id: bigint) => void;
}) {
  const [query, setQuery] = useState("");

  const { data: nextId } = useReadContract({
    address: contractAddress,
    abi: sealedVerdictAbi,
    functionName: "nextBountyId",
    chainId: ritualChain.id,
    query: { enabled: !!contractAddress },
  });

  const next = nextId ? Number(nextId) : 1;
  // An owner-scoped view ("bounties you created") must search every id, not
  // just the most recent ones -- otherwise an older bounty silently vanishes
  // from "/me" once 12+ newer bounties exist. Only cap the general browse view.
  const cap = owner ? Infinity : 12;
  const ids: number[] = [];
  for (let i = next - 1; i >= 1 && ids.length < cap; i--) ids.push(i);

  // Each card decides its own visibility (owner/status filter) after its data
  // loads. Track which ids are currently hidden so we can show a "no results"
  // message instead of a silently blank grid when every card hides itself.
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const markHidden = useCallback((id: number, hidden: boolean) => {
    setHiddenIds((prev) => {
      const isHidden = prev.has(id);
      if (isHidden === hidden) return prev;
      const next = new Set(prev);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const allHidden = ids.length > 0 && ids.every((id) => hiddenIds.has(id));

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const t = query.trim();
    if (!t) return;
    try {
      const id = BigInt(t);
      if (id >= 0n) onOpen(id);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {!hideSearch && (
        <form
          onSubmit={submitSearch}
          className="mb-4 flex items-center rounded-full border border-line bg-surface"
        >
          <span className="flex items-center px-4 py-2.5 text-muted">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by bounty ID…"
            className="flex-1 bg-transparent py-2.5 pr-4 font-mono text-[12.5px] text-ink outline-none placeholder:text-muted"
          />
        </form>
      )}

      {ids.length === 0 || allHidden ? (
        <div className="rounded-[16px] border border-line bg-surface px-6 py-[52px] text-center backdrop-blur-md">
          <div className="text-[18px] font-semibold">
            {ids.length === 0 ? "No bounties yet" : "No bounties match this filter"}
          </div>
          <p className="mx-auto mt-1.5 max-w-[40ch] text-[13px] text-muted">
            {ids.length === 0
              ? emptyText ?? "Post the first one. Every entry stays sealed until the deadline."
              : "Try a different tab, or clear the filter."}
          </p>
        </div>
      ) : null}
      {ids.length > 0 ? (
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 ${allHidden ? "hidden" : ""}`}>
          {ids.map((id) => (
            <BountyCard
              key={id}
              id={BigInt(id)}
              filter={filter}
              owner={owner}
              onOpen={onOpen}
              onVisibility={(hidden) => markHidden(id, hidden)}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

function BountyCard({
  id,
  filter,
  owner,
  onOpen,
  onVisibility,
}: {
  id: bigint;
  filter: RegistryFilter;
  owner?: string;
  onOpen: (id: bigint) => void;
  onVisibility: (hidden: boolean) => void;
}) {
  const now = useNow();
  const { data } = useReadContract({
    address: contractAddress,
    abi: sealedVerdictAbi,
    functionName: "getBounty",
    args: [id],
    chainId: ritualChain.id,
    query: { enabled: !!contractAddress },
  });

  const b = data ? parseBounty(data as never) : null;
  const status = b ? getBountyStatus(b, now / 1000) : null;
  const hidden =
    !!b &&
    (/^0x0+$/.test(b.owner) ||
      (!!owner && b.owner.toLowerCase() !== owner.toLowerCase()) ||
      (filter !== "all" && status !== filter));

  // Report visibility once data has actually loaded -- while loading (b is
  // still null) we don't know yet, so don't count this card as hidden and
  // risk the parent showing "no results" while the real answer is pending.
  useEffect(() => {
    if (b) onVisibility(hidden);
  }, [b, hidden, onVisibility]);

  if (!data) {
    return (
      <div className="rounded-[16px] border border-line bg-surface p-5 backdrop-blur-md">
        <span className="block h-4 w-24 animate-pulse rounded bg-white/[0.08]" />
        <span className="mt-4 block h-6 w-3/4 animate-pulse rounded bg-white/[0.08]" />
        <span className="mt-6 block h-8 w-1/3 animate-pulse rounded bg-white/[0.08]" />
      </div>
    );
  }
  if (!b || hidden) return null;

  const ph = PHASE[status!];
  // formatRelative already prefixes "in " (e.g. "in 11h 29m"), so these
  // templates must not add their own "in" too.
  const closes =
    status === "open"
      ? `Closes ${formatRelative(b.deadline)}`
      : status === "reveal"
        ? `Reveal closes ${formatRelative(revealDeadline(b))}`
        : status === "finalized"
          ? "Settled"
          : "Awaiting judgment";
  const entries = Number(b.submissionCount);
  const fill = Math.max(4, Math.min(100, (entries / 10) * 100));

  return (
    <button
      onClick={() => onOpen(id)}
      className="group flex flex-col rounded-[16px] border border-line bg-surface p-5 text-left backdrop-blur-md transition hover:border-green/40 hover:shadow-[0_0_30px_rgba(53,208,127,0.12)]"
    >
      <div className="mb-3.5 flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.06em] text-muted">Case №{id.toString()}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] ${ph.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ph.dot}`} />
          {ph.label}
        </span>
      </div>

      <div className="mb-1 line-clamp-2 min-h-[52px] text-[20px] font-semibold leading-[1.15]">
        {b.title || "Untitled"}
      </div>
      <div className="mb-4 font-mono text-[10.5px] text-muted">by {shortenAddress(b.owner)}</div>

      {/* entries fill bar */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] text-muted">
          <span>{entries} / 10 entries</span>
          <span>{closes}</span>
        </div>
        <div className="h-[6px] overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-green shadow-[0_0_10px_rgba(53,208,127,0.6)]" style={{ width: `${fill}%` }} />
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Reward</div>
          <div className="mt-1 font-mono text-[24px] font-bold leading-none text-green">{formatReward(b.reward)}</div>
        </div>
        <span className="font-mono text-[12px] font-medium text-green transition group-hover:translate-x-0.5">Open →</span>
      </div>
    </button>
  );
}
