"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { parseEther, parseEventLogs } from "viem";
import { contractAddress, isContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { useWriteTx } from "@/hooks/useWriteTx";
import { REVEAL_WINDOW_SECONDS } from "@/lib/bounty";
import { formatTimestamp } from "@/lib/format";
import {
  CardHeader,
  CardBody,
  Field,
  Input,
  Textarea,
  Button,
  TxStatus,
  Notice,
} from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

/** Default datetime-local value = now + 1 hour, in the input's expected format. */
function defaultDeadline(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function CreateBountyForm({
  onCreated,
}: {
  onCreated?: (bountyId: bigint) => void;
}) {
  const { isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [rubric, setRubric] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [reward, setReward] = useState("");
  const [createdId, setCreatedId] = useState<bigint | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const tx = useWriteTx((receipt) => {
    try {
      const logs = parseEventLogs({
        abi: sealedVerdictAbi,
        eventName: "BountyCreated",
        logs: receipt.logs,
      });
      const id = logs[0]?.args?.bountyId;
      if (id !== undefined) {
        setCreatedId(id);
        onCreated?.(id);
      }
    } catch {
      /* couldn't decode — not fatal */
    }
  });

  const validation = useMemo(() => {
    if (!title.trim()) return "Title is required.";
    if (!rubric.trim()) return "Rubric is required.";
    if (!deadline) return "Pick a deadline.";
    const ts = new Date(deadline).getTime();
    if (!Number.isFinite(ts)) return "Invalid deadline.";
    if (reward !== "") {
      try {
        parseEther(reward);
      } catch {
        return "Reward must be a valid number.";
      }
    }
    return null;
  }, [title, rubric, deadline, reward]);

  // Live filing summary (pure, render-safe).
  const deadlineSec = useMemo(() => {
    const ms = new Date(deadline).getTime();
    return Number.isFinite(ms) ? BigInt(Math.floor(ms / 1000)) : null;
  }, [deadline]);

  const rewardLabel = reward.trim() === "" ? "None set" : `${reward.trim()} RITUAL`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (validation || !contractAddress) return;

    const deadlineMs = new Date(deadline).getTime();
    if (deadlineMs <= Date.now()) {
      setSubmitError("Deadline must be in the future.");
      return;
    }

    const deadlineTs = BigInt(Math.floor(deadlineMs / 1000));
    const value = reward.trim() === "" ? 0n : parseEther(reward.trim());
    setCreatedId(null);

    try {
      await tx.run({
        address: contractAddress,
        abi: sealedVerdictAbi,
        functionName: "createBounty",
        args: [title.trim(), rubric.trim(), deadlineTs],
        value,
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced via tx.state */
    }
  }

  const summaryRows: Array<[string, string]> = [
    ["Reward", rewardLabel],
    ["Commit deadline", deadlineSec ? formatTimestamp(deadlineSec) : "-"],
    [
      "Reveal closes",
      deadlineSec ? formatTimestamp(deadlineSec + REVEAL_WINDOW_SECONDS) : "-",
    ],
  ];

  return (
    <div>
      <CardHeader
        index="02"
        title="File a bounty"
        subtitle="Escrow a reward and define how answers are scored."
      />
      <CardBody>
        {!isContractConfigured && (
          <div className="mb-4">
            <Notice tone="amber">
              Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local to enable
              transactions.
            </Notice>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-[1fr_300px]"
        >
          {/* Left: fields */}
          <div className="space-y-4">
            <Field label="Title">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Best gas-optimization writeup"
                maxLength={200}
              />
            </Field>

            <Field
              label="Rubric"
              hint="How answers are scored. The model judges only against this."
            >
              <Textarea
                value={rubric}
                onChange={(e) => setRubric(e.target.value)}
                rows={4}
                placeholder="Correctness 50%, clarity 30%, novelty 20%"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Deadline">
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </Field>
              <Field label="Reward (RITUAL)" hint="Escrowed on creation.">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder="1.0"
                />
              </Field>
            </div>
          </div>

          {/* Right: live filing summary ledger */}
          <div className="lg:pt-[26px]">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
              Filing summary
            </div>
            <dl className="mt-2">
              {summaryRows.map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-baseline justify-between gap-3 border-t border-rule py-2"
                >
                  <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
                    {k}
                  </dt>
                  <dd className="text-right font-mono text-[12px] text-paper">
                    {v}
                  </dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
                  Escrowed now
                </dt>
                <dd className="text-right font-mono text-[12px] text-paper">
                  {rewardLabel}
                </dd>
              </div>
              <div className="rule-double" />
            </dl>

            <div className="mt-4">
              <Button
                type="submit"
                disabled={
                  !isConnected ||
                  !isContractConfigured ||
                  !!validation ||
                  tx.isBusy
                }
                className="w-full"
              >
                {tx.isBusy ? "Filing" : "Create and escrow →"}
              </Button>
              {!isConnected && (
                <p className="mt-2 font-mono text-[11px] text-mute">
                  Connect a wallet to file.
                </p>
              )}
            </div>
          </div>

          {/* Full-width status row */}
          <div className="lg:col-span-2">
            {validation && (title || rubric || reward) ? (
              <p className="font-mono text-[12px] text-gilt">{validation}</p>
            ) : null}
            {submitError ? (
              <p className="font-mono text-[12px] text-seal">{submitError}</p>
            ) : null}
            <TxStatus
              state={tx.state}
              error={tx.error}
              hash={tx.hash}
              explorerBase={explorerBase}
            />
            {createdId !== null && (
              <div className="mt-3">
                <Notice tone="green">
                  Filed as No. {createdId.toString()}. Opening the record.
                </Notice>
              </div>
            )}
          </div>
        </form>
      </CardBody>
    </div>
  );
}
