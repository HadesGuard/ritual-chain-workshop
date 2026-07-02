"use client";

import { decodeAiReview } from "@/lib/aiReview";
import { Notice } from "@/components/ui";

export function AIReviewDisplay({ aiReview }: { aiReview: `0x${string}` }) {
  const decoded = decodeAiReview(aiReview);
  if (!decoded) return null;

  const { raw, parsed } = decoded;

  if (!parsed) {
    return (
      <div className="space-y-3">
        <Notice tone="amber">
          The model&rsquo;s output could not be parsed as JSON. Raw text follows.
        </Notice>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words border border-rule bg-well p-3 font-mono text-[12px] text-stone">
          {raw}
        </pre>
      </div>
    );
  }

  const ranked = [...parsed.ranking].sort((a, b) => b.score - a.score);

  return (
    <div>
      {parsed.summary && (
        <blockquote className="border-y border-rule py-4">
          <p className="font-serif text-[18px] italic leading-relaxed text-paper">
            {parsed.summary}
          </p>
        </blockquote>
      )}

      {ranked.length > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-[3rem_3rem_1fr] gap-4 border-b border-rule pb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
            <span>Rank</span>
            <span>Exh.</span>
            <span>Reason</span>
          </div>
          {ranked.map((r, pos) => (
            <div
              key={r.index}
              className={`grid grid-cols-[3rem_3rem_1fr] items-start gap-4 border-t border-rule py-2.5 ${
                r.index === parsed.winnerIndex ? "bg-emerald/[0.08]" : ""
              }`}
            >
              <span className="font-mono text-[13px] text-stone">
                {String(pos + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-[13px] text-paper">
                {String(r.index).padStart(2, "0")}
                {r.index === parsed.winnerIndex ? (
                  <span className="ml-1 text-emerald-bright">·</span>
                ) : null}
              </span>
              <span className="text-[13px] leading-snug text-stone">
                <span className="mr-2 font-mono text-[12px] text-emerald-bright">
                  {r.score}
                </span>
                {r.reason}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
