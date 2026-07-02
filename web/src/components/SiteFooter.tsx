"use client";

import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { shortenAddress } from "@/lib/format";
import { CopyText } from "@/components/ui";

export function SiteFooter() {
  const explorer = ritualChain.blockExplorers?.default.url;
  return (
    <footer className="mx-auto mt-16 w-full max-w-[1120px] px-5 pb-8 sm:px-10">
      <div className="grid grid-cols-1 gap-3 border-t border-emphasis pt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-stone sm:grid-cols-3">
        <div>
          {contractAddress ? (
            <>
              Contract{" "}
              <CopyText
                value={contractAddress}
                display={shortenAddress(contractAddress, 6)}
                className="text-[11px] uppercase text-paper"
              />
            </>
          ) : (
            <>Contract not configured</>
          )}
        </div>
        <div className="sm:text-center">
          {explorer ? (
            <a
              href={explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-mute underline-offset-4 hover:decoration-paper hover:text-paper"
            >
              Explorer ↗
            </a>
          ) : (
            <>Chain {ritualChain.id}</>
          )}
        </div>
        <div className="sm:text-right">
          The model recommends. The owner enters judgment.
        </div>
      </div>
    </footer>
  );
}
