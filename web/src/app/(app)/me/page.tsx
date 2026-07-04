"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import sealedVerdictAbi from "@/abi/SealedVerdict";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { parseBounty, getBountyStatus, type BountyStatus } from "@/lib/bounty";
import { formatReward } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import {
  exportCommitments,
  importCommitments,
  listMyBountyIds,
} from "@/lib/commitment";
import { BountyRegistry } from "@/components/BountyRegistry";

const PHASE: Record<BountyStatus, { label: string; cls: string }> = {
  open: { label: "Sealing", cls: "bg-indigo-tint text-indigo-soft" },
  reveal: { label: "Reveal", cls: "bg-green-tint text-green-bright" },
  ready: { label: "Judging", cls: "bg-amber-tint text-amber-text" },
  judged: { label: "Judging", cls: "bg-amber-tint text-amber-text" },
  finalized: { label: "Settled", cls: "bg-white/[0.06] text-muted" },
};

export default function MePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const open = (id: bigint) => router.push(`/bounty/${id.toString()}`);

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-[120px] pt-14">
      <h1 className="m-0 text-[34px] font-bold tracking-[-0.02em]">Your activity</h1>
      <p className="mb-8 mt-2 text-[15px] text-text2">
        Bounties you posted, entries you sealed, and a backup of your salts.
      </p>

      {!isConnected || !address ? (
        <div className="rounded-[16px] border border-line bg-surface px-6 py-14 text-center backdrop-blur-md">
          <div className="text-[18px] font-semibold">Connect your wallet</div>
          <p className="mx-auto mt-1.5 max-w-[40ch] text-[13px] text-muted">
            Connect to see the bounties you created and the entries you sealed.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          <SaltBackup />

          <section>
            <h2 className="mb-4 text-[22px] font-semibold">Bounties you created</h2>
            <BountyRegistry
              owner={address}
              hideSearch
              emptyText="You haven’t posted a bounty yet."
              onOpen={open}
            />
          </section>

          <YourEntries key={address} account={address} onOpen={open} />
        </div>
      )}
    </main>
  );
}

function SaltBackup() {
  const [count, setCount] = useState(() => exportCommitments().length);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function download() {
    const entries = exportCommitments();
    const blob = new Blob(
      [JSON.stringify({ app: "sealedverdict", version: 1, entries }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sealedverdict-salts.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const n = importCommitments(Array.isArray(parsed) ? parsed : parsed.entries ?? []);
        setCount(exportCommitments().length);
        setMsg(`Imported ${n} entr${n === 1 ? "y" : "ies"}.`);
      } catch {
        setMsg("Couldn’t read that file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <section className="rounded-[16px] border border-line bg-surface p-6 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[18px] font-semibold">Salt backup</div>
          <p className="mt-1 max-w-[60ch] text-[13px] leading-[1.55] text-text2">
            Your answers and salts live in this browser only. Lose them and you can’t reveal, so
            your entry is forfeited. Export a backup and keep it safe, or import one to reveal from
            another device.
          </p>
          <div className="mt-2 font-mono text-[11px] text-muted">
            {count} saved on this device
            {msg ? <span className="ml-2 text-green-bright">· {msg}</span> : null}
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={download}
            disabled={count === 0}
            className="rounded-full bg-green px-5 py-2.5 text-[13px] font-semibold text-on-accent shadow-[0_0_20px_rgba(53,208,127,0.25)] disabled:opacity-40"
          >
            Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-line bg-surface px-5 py-2.5 text-[13px] font-semibold text-ink hover:bg-white/[0.08]"
          >
            Import
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
        </div>
      </div>
    </section>
  );
}

function YourEntries({ account, onOpen }: { account: `0x${string}`; onOpen: (id: bigint) => void }) {
  const [ids] = useState<bigint[]>(() =>
    contractAddress ? listMyBountyIds(contractAddress, account) : [],
  );

  return (
    <section>
      <h2 className="mb-4 text-[22px] font-semibold">Your sealed entries</h2>
      {ids.length === 0 ? (
        <div className="rounded-[16px] border border-line bg-surface px-6 py-12 text-center backdrop-blur-md">
          <div className="text-[16px] font-semibold">No entries yet</div>
          <p className="mx-auto mt-1.5 max-w-[44ch] text-[13px] text-muted">
            When you commit an answer, it shows up here so you remember to come back and reveal.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-line bg-surface backdrop-blur-md">
          {ids.map((id) => (
            <EntryRow key={id.toString()} id={id} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

function EntryRow({ id, onOpen }: { id: bigint; onOpen: (id: bigint) => void }) {
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
  const ph = status ? PHASE[status] : null;
  const action =
    status === "reveal" ? "Reveal now →" : status === "open" ? "Sealed →" : "View →";

  return (
    <button
      onClick={() => onOpen(id)}
      className="flex w-full items-center justify-between gap-4 border-b border-line px-6 py-4 text-left transition last:border-b-0 hover:bg-white/[0.04]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] text-muted">Case №{id.toString()}</span>
          {ph ? (
            <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] ${ph.cls}`}>
              {ph.label}
            </span>
          ) : null}
        </div>
        <div className="mt-1 truncate text-[16px] font-medium">{b?.title ?? "…"}</div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {b ? <span className="font-mono text-[14px] font-semibold text-green">{formatReward(b.reward)}</span> : null}
        <span className={`font-mono text-[12px] font-medium ${status === "reveal" ? "text-green-bright" : "text-muted"}`}>
          {action}
        </span>
      </div>
    </button>
  );
}
