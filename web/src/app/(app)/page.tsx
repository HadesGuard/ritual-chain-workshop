"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BountyRegistry } from "@/components/BountyRegistry";
import { isContractConfigured } from "@/config/contract";
import { Notice } from "@/components/ui";

const STEPS = [
  "You put up a prize and lock it in escrow.",
  "People send answers. Each one is sealed.",
  "After the deadline, they unseal their answers.",
  "An AI scores them and suggests a winner.",
  "You pick the winner. The contract pays them.",
];

const FEATURES = [
  {
    title: "Nobody can peek",
    body: "Every answer is stored as a hash on-chain. No one can read it, not even you, until the person unseals it after the deadline.",
  },
  {
    title: "The AI only suggests",
    body: "The AI scores each answer against your rubric and suggests a winner. You make the call, and you can ignore it.",
  },
  {
    title: "The prize is locked",
    body: "The prize is locked the moment you post the bounty. The contract pays the winner once you choose. If no one unseals, you get it back.",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-[1180px] px-[26px] pb-[120px]">
      {/* HERO */}
      <section className="grid grid-cols-1 border-b-[1.5px] border-l-[1.5px] border-r-[1.5px] border-line lg:grid-cols-[1.35fr_1fr]">
        <div className="border-r-[1.5px] border-line px-[46px] pb-[44px] pt-[52px]">
          <div className="mb-[26px] font-mono text-[11px] uppercase tracking-[0.24em] text-indigo">
            What this is
          </div>
          <h1 className="m-0 text-[46px] font-medium leading-[1.02] tracking-[-0.02em] sm:text-[62px]">
            Post a bounty.
            <br />
            Get sealed entries.
            <br />
            <span className="italic text-indigo">Pay the best one.</span>
          </h1>
          <p className="mb-[30px] mt-[22px] max-w-[46ch] text-[16.5px] leading-[1.6] text-text2">
            You put up a cash prize and lock it in escrow. People send in answers
            that stay hidden until the deadline, so no one can copy. An AI scores
            every entry, you pick the winner, and the contract pays them.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/create"
              className="rounded-[12px] border border-indigo-deep bg-indigo px-6 py-3.5 text-[14px] font-semibold text-[#f9fafb] shadow-[0_6px_18px_rgba(16,24,40,0.10)]"
            >
              Post a bounty →
            </Link>
            <a
              href="#registry"
              className="rounded-[14px] border border-line bg-surface px-6 py-3.5 text-[14px] font-semibold text-ink shadow-[0_6px_18px_rgba(16,24,40,0.10)]"
            >
              Browse bounties
            </a>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[14px] bg-panel px-[34px] py-[38px] text-on-panel-soft">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-soft">
            How it works
          </div>
          <div className="my-5 flex flex-col">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`flex gap-[15px] py-[13px] ${i < STEPS.length - 1 ? "border-b border-panel-line" : ""}`}
              >
                <span className="w-5 font-mono text-[12px] text-indigo-soft">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13.5px] text-on-panel">{s}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-panel-line pt-4 text-[15px] italic text-muted">
            “The AI helps. You decide.”
          </div>
        </div>
      </section>

      {!isContractConfigured && (
        <div className="mt-6">
          <Notice tone="amber">
            No contract configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS to load
            bounties.
          </Notice>
        </div>
      )}

      {/* REGISTRY */}
      <div id="registry">
        <BountyRegistry onOpen={(id) => router.push(`/bounty/${id.toString()}`)} />
      </div>

      {/* FEATURES */}
      <div className="mt-[44px] grid grid-cols-1 rounded-[14px] border border-line sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`px-6 py-[26px] ${i < FEATURES.length - 1 ? "border-b border-line sm:border-b-0 sm:border-r-[1.5px]" : ""}`}
          >
            <div className="mb-2 text-[23px] font-medium">{f.title}</div>
            <p className="m-0 text-[13.5px] leading-[1.55] text-text2">{f.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
