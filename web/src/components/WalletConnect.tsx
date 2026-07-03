"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { ritualChain } from "@/config/wagmi";
import { shortenAddress } from "@/lib/format";

export function WalletChip() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const wrongNet = isConnected && chainId !== ritualChain.id;

  if (isConnected && address) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-[9px] rounded-[14px] border border-line bg-surface px-3 py-[7px]"
        >
          <span
            className={`h-[7px] w-[7px] rounded-full ${wrongNet ? "bg-wax" : "bg-green"}`}
          />
          <span className="leading-[1.1] text-left">
            <span className="block font-mono text-[12px] font-medium">
              {shortenAddress(address)}
            </span>
            <span
              className={`mt-0.5 block font-mono text-[9px] uppercase tracking-[0.06em] ${wrongNet ? "text-wax" : "text-muted"}`}
            >
              {wrongNet ? "Wrong network" : ritualChain.name}
            </span>
          </span>
        </button>
        {open && (
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-[14px] border border-line bg-surface p-1 shadow-[0_30px_70px_rgba(16,24,40,0.22)]">
            {wrongNet && (
              <button
                onClick={() => {
                  switchChain({ chainId: ritualChain.id });
                  setOpen(false);
                }}
                className="block w-full rounded-[10px] px-3 py-2 text-left text-[13px] font-semibold text-indigo hover:bg-bg"
              >
                Switch to {ritualChain.name}
              </button>
            )}
            <button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="block w-full rounded-[10px] px-3 py-2 text-left font-mono text-[11px] text-muted hover:bg-bg"
            >
              disconnect wallet
            </button>
          </div>
        )}
      </div>
    );
  }

  const seen = new Set<string>();
  const list = connectors.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="rounded-[14px] bg-panel px-4 py-[9px] text-[13px] font-semibold tracking-[0.02em] text-indigo-tint2"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-[14px] border border-line bg-surface p-3 shadow-[0_30px_70px_rgba(16,24,40,0.22)]">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Wallet
          </div>
          <div className="flex flex-col gap-2.5">
            {list.length === 0 && (
              <div className="font-mono text-[11px] text-muted">No connectors found.</div>
            )}
            {list.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  connect({ connector });
                  setOpen(false);
                }}
                className="flex items-center justify-between rounded-[14px] border border-line bg-surface px-4 py-3.5 hover:bg-bg"
              >
                <span className="text-[14px] font-semibold">{connector.name}</span>
                <span className="font-mono text-[11px] text-indigo">connect →</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
