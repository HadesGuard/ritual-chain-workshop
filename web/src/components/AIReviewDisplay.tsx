"use client";

import { decodeAiReview } from "@/lib/aiReview";

export function AIReviewDisplay({ aiReview }: { aiReview: `0x${string}` }) {
  const decoded = decodeAiReview(aiReview);
  if (!decoded) return null;
  const { raw, parsed } = decoded;

  if (!parsed) {
    return (
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <div className="border-b-[1.5px] border-line px-6 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-indigo">
          AI review
        </div>
        <div className="px-6 py-4">
          <div className="mb-3 rounded-[12px] border border-amber bg-amber-tint px-4 py-3 text-[13px] text-amber-text2">
            The model’s output could not be parsed as JSON. Raw text follows.
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-[10px] border border-line bg-bg p-3 font-mono text-[12px] text-text2">
            {raw}
          </pre>
        </div>
      </div>
    );
  }

  const ranked = [...parsed.ranking].sort((a, b) => b.score - a.score);
  const place = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="flex items-center gap-3 border-b-[1.5px] border-line px-6 py-[18px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[14px] border border-line bg-panel font-mono text-[11px] text-indigo-soft">
          AI
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-indigo">
            AI review
          </div>
          <div className="mt-0.5 text-[19px] font-medium">The AI scored every unsealed answer.</div>
        </div>
      </div>

      {parsed.summary ? (
        <div className="border-b-[1.5px] border-line bg-bg px-6 py-[18px] text-[14px] leading-[1.6] text-text3">
          <b className="font-semibold">Summary. </b>
          {parsed.summary}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 px-6 py-[18px]">
        {ranked.map((r, pos) => {
          const top = r.index === parsed.winnerIndex;
          return (
            <div
              key={r.index}
              className={`rounded-[12px] border p-4 ${top ? "border-green bg-green-tint" : "border-line bg-surface"}`}
            >
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[12px] text-muted">{place[pos] ?? `#${pos + 1}`}</span>
                  <span className="text-[18px] font-medium">Entry #{r.index}</span>
                  {top ? (
                    <span className="bg-green px-2 py-[3px] font-mono text-[9px] uppercase tracking-[0.1em] text-green-tint">
                      Recommended
                    </span>
                  ) : null}
                </div>
                <div className="font-mono text-[20px] font-semibold text-green">
                  {r.score}
                  <span className="text-[12px] text-muted">/10</span>
                </div>
              </div>
              <div className="mb-[11px] h-[6px] bg-line">
                <div
                  className="h-full bg-green"
                  style={{ width: `${Math.max(0, Math.min(100, r.score * 10))}%` }}
                />
              </div>
              {r.reason ? (
                <div className="text-[13px] italic leading-[1.55] text-text2">“{r.reason}”</div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 border-t-[1.5px] border-line bg-surface px-6 py-3.5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5b54e6" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        <div className="text-[12px] leading-[1.4] text-text2">
          This is a <b>suggestion, not a decision</b>. You pick the winner and can ignore the AI.
        </div>
      </div>
    </div>
  );
}
