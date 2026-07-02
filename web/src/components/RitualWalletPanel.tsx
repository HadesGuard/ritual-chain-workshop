"use client";

import { formatEther } from "viem";
import { RITUAL_WALLET, ritualWalletAbi } from "@/abi/RitualWallet";
import { DEPOSIT_AMOUNT, LOCK_DURATION, type RitualWalletStatus } from "@/lib/ritualWallet";
import { ritualChain } from "@/config/wagmi";
import { useWriteTx } from "@/hooks/useWriteTx";
import { Badge, Button, Notice, Spinner, TxStatus } from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

type Status = Partial<RitualWalletStatus> & { isLoading: boolean; hasData: boolean };

/**
 * RitualWallet funding preflight shown above judging. Surfaces the current
 * balance / lock vs. the live block, and lets the owner deposit + lock LLM fees
 * without touching the bounty reward (that stays in the SealedVerdict contract).
 */
export function RitualWalletPanel({
  status,
  onDeposited,
}: {
  status: Status;
  onDeposited: () => void;
}) {
  const tx = useWriteTx(() => onDeposited());

  async function handleDeposit() {
    try {
      await tx.run({
        address: RITUAL_WALLET,
        abi: ritualWalletAbi,
        functionName: "deposit",
        args: [LOCK_DURATION],
        value: DEPOSIT_AMOUNT,
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced via tx.state */
    }
  }

  if (!status.hasData) {
    return (
      <div className="flex items-center gap-2 font-mono text-[12px] text-mute">
        <Spinner /> Checking RitualWallet funding
      </div>
    );
  }

  const { ready, lockExpired, balance, lockUntil, currentBlock } = status;

  const badge = ready ? (
    <Badge tone="green">Ready</Badge>
  ) : lockExpired ? (
    <Badge tone="red">Lock expired</Badge>
  ) : (
    <Badge tone="amber">Deposit required</Badge>
  );

  const rows: Array<[string, string]> = [
    ["Balance", `${formatEther(balance ?? 0n)} RITUAL`],
    ["Lock until block", (lockUntil ?? 0n).toString()],
    ["Current block", (currentBlock ?? 0n).toString()],
  ];

  return (
    <div className="border border-rule p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
          LLM fee preflight
        </span>
        {badge}
      </div>

      <dl className="mt-3">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-3 border-t border-rule py-1.5"
          >
            <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
              {k}
            </dt>
            <dd className="font-mono text-[12px] text-paper">{v}</dd>
          </div>
        ))}
      </dl>

      {!ready && (
        <div className="mt-3 space-y-2">
          <p className="font-mono text-[12px] text-stone">
            Judging spends prepaid RITUAL locked in RitualWallet. Deposit{" "}
            {formatEther(DEPOSIT_AMOUNT)} RITUAL and lock for{" "}
            {LOCK_DURATION.toLocaleString()} blocks.
          </p>
          <Button onClick={handleDeposit} disabled={tx.isBusy} className="w-full">
            {tx.isBusy
              ? "Depositing"
              : `Deposit ${formatEther(DEPOSIT_AMOUNT)} RITUAL →`}
          </Button>
          <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
        </div>
      )}

      {ready && (
        <div className="mt-3">
          <Notice tone="green">
            Funded. Locked until block {(lockUntil ?? 0n).toString()}. Judging is
            available.
          </Notice>
        </div>
      )}
    </div>
  );
}
