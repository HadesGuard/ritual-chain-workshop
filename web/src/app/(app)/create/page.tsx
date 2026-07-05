"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { parseEther, parseEventLogs } from "viem";
import { contractAddress, isContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { useWriteTx } from "@/hooks/useWriteTx";
import { REVEAL_WINDOW_SECONDS } from "@/lib/bounty";
import { formatTimestamp } from "@/lib/format";
import { TxStatus, Notice } from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

function defaultDeadline(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreatePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [rubric, setRubric] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [reward, setReward] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const tx = useWriteTx((receipt) => {
    try {
      const logs = parseEventLogs({
        abi: sealedVerdictAbi,
        eventName: "BountyCreated",
        logs: receipt.logs,
      });
      const id = logs[0]?.args?.bountyId;
      if (id !== undefined) router.push(`/bounty/${id.toString()}`);
    } catch {
      /* ignore */
    }
  });

  const deadlineSec = useMemo(() => {
    const ms = new Date(deadline).getTime();
    return Number.isFinite(ms) ? BigInt(Math.floor(ms / 1000)) : null;
  }, [deadline]);

  const validation = useMemo(() => {
    if (!title.trim()) return "Add a title.";
    if (!rubric.trim()) return "Add a rubric.";
    if (!deadline) return "Pick a deadline.";
    if (reward !== "") {
      try {
        parseEther(reward);
      } catch {
        return "Reward must be a number.";
      }
    }
    return null;
  }, [title, rubric, deadline, reward]);

  async function fund() {
    setSubmitError(null);
    if (validation || !contractAddress) return;
    const ms = new Date(deadline).getTime();
    if (ms <= Date.now()) {
      setSubmitError("Deadline must be in the future.");
      return;
    }
    const value = reward.trim() === "" ? 0n : parseEther(reward.trim());
    try {
      await tx.run({
        address: contractAddress,
        abi: sealedVerdictAbi,
        functionName: "createBounty",
        args: [title.trim(), rubric.trim(), BigInt(Math.floor(ms / 1000))],
        value,
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced via tx.state */
    }
  }

  const rewardLabel = reward.trim() === "" ? "0.00" : reward.trim();
  const canFund = isConnected && isContractConfigured && !validation && !tx.isBusy;

  const labelCls = "mb-2.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted";
  const lineInput =
    "w-full border-0 border-b-[1.5px] border-line bg-transparent pb-3 pt-1.5 outline-none focus:border-indigo";

  return (
    <main className="mx-auto max-w-[1180px] px-[26px] pb-[120px]">
      <div className="flex items-baseline gap-4 border-b-[1.5px] border-line pb-5 pt-[34px]">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo">
          New bounty
        </span>
        <span className="h-px flex-1" />
        <Link href="/" className="font-mono text-[11px] text-muted hover:text-ink">
          ← back to registry
        </Link>
      </div>

      <div className="grid grid-cols-1 border-b-[1.5px] border-l-[1.5px] border-r-[1.5px] border-line lg:grid-cols-[1.55fr_1fr]">
        {/* FORM */}
        <div className="flex flex-col gap-[34px] border-line px-5 py-8 sm:px-[42px] sm:py-10 lg:border-r-[1.5px]">
          <div>
            <div className={labelCls}>01 · Title of the challenge</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The strongest argument for account abstraction"
              maxLength={200}
              className={`${lineInput} text-[26px] font-medium`}
            />
          </div>

          <div>
            <div className={labelCls}>02 · The rubric · how entries are scored</div>
            <textarea
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              rows={6}
              placeholder={
                "State the criteria the AI and you judge against, e.g.\n· Clarity of argument (30%)\n· Technical rigor (30%)\n· Novelty (20%)\n· Real-world feasibility (20%)"
              }
              className="w-full resize-y rounded-[14px] border border-line bg-surface px-4 py-3.5 text-[14px] leading-[1.6] text-ink outline-none focus:border-indigo"
            />
            <div className="mt-2 text-[12px] italic text-muted">
              A clear rubric means fairer scoring. Both the entrants and the AI see it.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[0.8fr_1fr_1fr]">
            <div>
              <div className={labelCls}>03 · Reward (RITUAL)</div>
              <div className="flex items-center border-b-[1.5px] border-line">
                <span className="pr-2 font-mono text-[16px] text-green">◇</span>
                <input
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  inputMode="decimal"
                  placeholder="4.00"
                  className="w-full border-0 bg-transparent pb-3 pt-2 font-mono text-[22px] font-semibold outline-none"
                />
              </div>
            </div>
            <div>
              <div className={labelCls}>04 · Submission deadline</div>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={`${lineInput} font-mono text-[14px]`}
              />
            </div>
            <div>
              <div className={labelCls}>05 · Reveal window</div>
              <div className="border-b-[1.5px] border-line pb-3 pt-[11px] font-mono text-[14px] text-muted">
                +24 hours (fixed)
              </div>
            </div>
          </div>

          <div>
            <div className={labelCls}>06 · How answers stay hidden</div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="rounded-[14px] border border-green/50 bg-green-tint p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[14px] font-bold">Commit-Reveal</span>
                  <span className="rounded-full bg-green px-2 py-[3px] font-mono text-[9px] tracking-[0.1em] text-on-accent">
                    THIS DEPLOYMENT
                  </span>
                </div>
                <div className="text-[12px] leading-[1.5] text-text2">
                  Entrants post a hash now, then reveal their answer and salt after the deadline. The
                  contract checks it matches. This is the live mode.
                </div>
              </div>
              <Link
                href="/advanced"
                className="group rounded-[14px] border border-line bg-surface p-4 transition hover:border-indigo-soft"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[14px] font-bold">Ritual TEE</span>
                  <span className="rounded-full bg-indigo-tint px-2 py-[3px] font-mono text-[9px] tracking-[0.1em] text-indigo-soft">
                    ADVANCED TRACK
                  </span>
                </div>
                <div className="text-[12px] leading-[1.5] text-text2">
                  Answers are encrypted to the enclave and never made public. Judged inside a TEE.
                </div>
                <div className="mt-2 font-mono text-[11px] text-indigo-soft group-hover:underline">
                  How it works →
                </div>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-[14px] bg-panel px-[18px] py-4 text-on-panel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5a1f2" strokeWidth="1.8" className="shrink-0">
              <rect x="4" y="10" width="16" height="11" rx="1" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <div className="text-[12.5px] leading-[1.5]">
              Both timers are written into the contract and{" "}
              <b className="text-indigo-tint">cannot be moved once funded</b>. Entrants
              who miss the reveal window forfeit their entry.
            </div>
          </div>
        </div>

        {/* CASE SLIP PREVIEW */}
        <div className="flex flex-col bg-surface px-[30px] py-9">
          <div className={labelCls}>About to be funded &amp; locked</div>

          <div className="relative overflow-hidden rounded-[14px] border border-line bg-surface">
            <div className="absolute right-0 top-0 bg-indigo px-2.5 py-[5px] font-mono text-[9px] uppercase tracking-[0.14em] text-indigo-tint">
              Draft
            </div>
            <div className="border-b-[1.5px] border-dashed border-line px-[22px] pb-[18px] pt-[22px]">
              <div className="mb-2 font-mono text-[10px] text-muted">Case №0x… · unfiled</div>
              <div className="min-h-[52px] text-[22px] font-medium leading-[1.15]">
                {title || "Your challenge title appears here."}
              </div>
            </div>
            <div className="border-b-[1.5px] border-dashed border-line px-[22px] py-5">
              <div className="mb-1.5 font-mono text-[10px] text-muted">Reward into escrow</div>
              <div className="font-mono text-[34px] font-semibold text-green">{rewardLabel} RITUAL</div>
              <div className="mt-1 font-mono text-[11px] text-muted">locked on funding</div>
            </div>
            <div className="flex flex-col gap-[11px] px-[22px] py-[18px] text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-muted">Reveal closes</span>
                <span className="font-mono">
                  {deadlineSec ? formatTimestamp(deadlineSec + REVEAL_WINDOW_SECONDS) : "not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Network</span>
                <span className="font-mono">{ritualChain.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Privacy</span>
                <span className="font-mono">Commit-Reveal</span>
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {!isContractConfigured && (
            <div className="mt-4">
              <Notice tone="amber">Set NEXT_PUBLIC_CONTRACT_ADDRESS to enable funding.</Notice>
            </div>
          )}
          {validation && (title || rubric || reward) ? (
            <p className="mt-4 text-[12px] text-amber-text">{validation}</p>
          ) : null}
          {submitError ? <p className="mt-2 text-[12px] text-wax">{submitError}</p> : null}

          <button
            onClick={fund}
            disabled={!canFund}
            className="mt-4 rounded-[12px] bg-green px-6 py-4 text-center text-[15px] font-semibold text-on-accent shadow-[0_0_28px_rgba(53,208,127,0.3)] disabled:opacity-50"
          >
            {tx.isBusy ? "Funding…" : "Fund & post bounty"}
          </button>
          <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
          {!isConnected && (
            <p className="mt-3 text-center text-[11px] text-muted">Connect a wallet to fund.</p>
          )}
          <p className="mt-3 text-center text-[11px] leading-[1.5] text-muted">
            Signing moves the prize into escrow. It’s paid out when you pick a winner, or
            returned to you if no one unseals.
          </p>
        </div>
      </div>
    </main>
  );
}
