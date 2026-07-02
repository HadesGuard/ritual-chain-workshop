"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CreateBountyForm } from "@/components/CreateBountyForm";
import { LoadBountyPanel } from "@/components/LoadBountyPanel";
import { useRecentBounties } from "@/hooks/useRecentBounties";
import { isContractConfigured } from "@/config/contract";
import { Kicker, Notice } from "@/components/ui";

const PROCEDURE = [
  {
    step: "01",
    name: "Commit",
    line: "Submit a hash, not an answer.",
    detail: "keccak256(answer, salt, sender, id)",
  },
  {
    step: "02",
    name: "Reveal",
    line: "Open the seal after the deadline.",
    detail: "window = deadline + 86,400s",
  },
  {
    step: "03",
    name: "Judge",
    line: "The model reads every revealed answer.",
    detail: "on-chain LLM precompile",
  },
  {
    step: "04",
    name: "Settle",
    line: "The owner enters judgment.",
    detail: "reward released by the contract",
  },
];

export default function Home() {
  const router = useRouter();
  const { ids, add } = useRecentBounties();

  const openBounty = useCallback(
    (id: bigint) => {
      add(id);
      router.push(`/bounty/${id.toString()}`);
    },
    [add, router],
  );

  return (
    <main className="mx-auto max-w-[1120px] px-5 sm:px-10">
      {/* Opening statement */}
      <section className="max-w-[720px] pb-16 pt-16">
        <Kicker>Sealed-bid bounties, judged on chain</Kicker>
        <h1 className="mt-3 font-serif text-[44px] font-medium leading-[1.06]">
          Answers under seal. Verdicts on the record.
        </h1>
        <p className="mt-4 max-w-[68ch] text-[15px] leading-[1.6] text-stone">
          Post a bounty with a rubric and an escrowed reward. Participants commit{" "}
          <span className="font-mono text-[13px] text-paper">
            keccak256(answer, salt, sender, id)
          </span>{" "}
          before the deadline and reveal after it. Ritual&rsquo;s on-chain model
          scores every revealed answer. The owner enters judgment and the
          contract pays the winner.
        </p>
        <div className="mt-6 flex items-center gap-5">
          <a
            href="#file"
            className="inline-flex h-9 items-center rounded-[2px] bg-emerald px-4 font-mono text-[12px] uppercase tracking-[0.08em] text-paper transition-colors hover:bg-[#15583c]"
          >
            File a bounty →
          </a>
          <a
            href="#procedure"
            className="font-mono text-[12px] uppercase tracking-[0.08em] text-emerald-bright underline decoration-emerald-bright/40 underline-offset-4 hover:decoration-emerald-bright"
          >
            Read the procedure →
          </a>
        </div>
      </section>

      {/* 01 Procedure */}
      <section id="procedure" className="border-t border-rule pt-6">
        <div className="flex gap-4">
          <span className="font-mono text-[11px] tracking-[0.08em] text-stone">
            01
          </span>
          <h2 className="font-serif text-[21px] font-medium">Procedure</h2>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {PROCEDURE.map((p, i) => (
            <div
              key={p.name}
              className={`border-t border-rule py-4 sm:py-5 lg:border-t-0 ${
                i > 0 ? "lg:border-l lg:border-rule lg:pl-5" : ""
              }`}
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
                {p.step} · {p.name}
              </div>
              <p className="mt-2 font-serif text-[18px] leading-snug text-paper">
                {p.line}
              </p>
              <p className="mt-2 font-mono text-[12px] text-stone">{p.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {!isContractConfigured && (
        <div className="mt-6">
          <Notice tone="amber">
            Contract not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS to file and
            retrieve bounties.
          </Notice>
        </div>
      )}

      {/* 02 File a bounty */}
      <div id="file" className="mt-16 border-t border-rule">
        <CreateBountyForm onCreated={openBounty} />
      </div>

      {/* 03 Docket */}
      <div className="mt-16 border-t border-rule">
        <LoadBountyPanel onOpen={openBounty} recentIds={ids} />
      </div>
    </main>
  );
}
