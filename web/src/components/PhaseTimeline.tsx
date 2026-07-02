"use client";

import { useNow } from "@/hooks/useNow";
import {
  getBountyStatus,
  revealDeadline,
  type Bounty,
} from "@/lib/bounty";
import { formatTimestamp } from "@/lib/format";

const STEPS = ["Commit", "Reveal", "Judgment", "Settlement"] as const;

/** status -> index of the currently-active step. */
function currentStep(status: ReturnType<typeof getBountyStatus>): number {
  switch (status) {
    case "open":
      return 0;
    case "reveal":
      return 1;
    case "ready":
    case "judged":
      return 2;
    case "finalized":
      return 3;
  }
}

function countdown(targetSec: bigint, nowMs: number): string {
  if (!nowMs) return " "; // en-space on first (now=0) tick, no hydration jump
  let s = Math.floor((Number(targetSec) * 1000 - nowMs) / 1000);
  if (s <= 0) return "elapsed";
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d) return `${d}d ${pad(h)}h ${pad(m)}m`;
  if (h) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

export function PhaseTimeline({ bounty }: { bounty: Bounty }) {
  const now = useNow(1000);
  const status = getBountyStatus(bounty, now / 1000);
  const current = currentStep(status);
  const revealClose = revealDeadline(bounty);

  function stateLine(i: number): { text: string; live?: boolean } {
    if (i === 0) {
      if (current > 0) return { text: `CLOSED · ${formatTimestamp(bounty.deadline)}` };
      return { text: `OPEN · ${countdown(bounty.deadline, now)}`, live: true };
    }
    if (i === 1) {
      if (current > 1) return { text: `CLOSED · ${formatTimestamp(revealClose)}` };
      if (current === 1) return { text: `OPEN · ${countdown(revealClose, now)}`, live: true };
      return { text: "PENDING" };
    }
    if (i === 2) {
      if (bounty.finalized) return { text: "ENTERED" };
      if (bounty.judged) return { text: "RECOMMENDED" };
      if (current === 2) return { text: "AWAITING" };
      return { text: "PENDING" };
    }
    // settlement
    if (bounty.finalized) return { text: `SETTLED · No. ${bounty.winnerIndex.toString()}` };
    return { text: "PENDING" };
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-4">
        {STEPS.map((label, i) => {
          const reached = i <= current;
          const { text, live } = stateLine(i);
          return (
            <div
              key={label}
              className={`border-t-2 pb-3 pt-2 ${reached ? "border-emerald" : "border-rule"} ${
                i > 0 ? "sm:pl-4" : ""
              } ${i > 0 ? "border-t sm:border-t-2" : ""}`}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] tracking-[0.08em] text-stone">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`font-mono text-[11px] uppercase tracking-[0.08em] ${
                    reached ? "text-paper" : "text-mute"
                  }`}
                >
                  {label}
                </span>
              </div>
              <div
                className={`mt-1 font-mono text-[12px] ${
                  live ? "text-emerald-bright" : reached ? "text-stone" : "text-mute"
                }`}
              >
                {text}
              </div>
            </div>
          );
        })}
      </div>
      {bounty.finalized ? (
        <div className="mt-0">
          <div className="rule-double" />
          <div className="pt-2">
            <span className="inline-flex items-center border border-paper bg-paper px-1.5 py-[3px] font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
              Judgment entered
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
