"use client";

import { useState } from "react";
import { CardHeader, CardBody, Input, Button } from "@/components/ui";

export function LoadBountyPanel({
  onOpen,
  recentIds,
}: {
  onOpen: (id: bigint) => void;
  recentIds: string[];
}) {
  const [value, setValue] = useState("");

  function load(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") return;
    try {
      const id = BigInt(trimmed);
      if (id < 0n) return;
      onOpen(id);
    } catch {
      /* not a number — ignore */
    }
  }

  return (
    <div>
      <CardHeader
        index="03"
        title="Docket"
        subtitle="Retrieve a bounty by its number."
      />
      <CardBody>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(value);
          }}
          className="flex items-end gap-2"
        >
          <Input
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="1"
            className="w-32 font-mono"
            aria-label="Bounty number"
          />
          <Button variant="secondary" type="submit">
            Retrieve →
          </Button>
        </form>

        {recentIds.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
              Viewed
            </div>
            <ul>
              {recentIds.map((id) => (
                <li key={id}>
                  <button
                    onClick={() => load(id)}
                    className="flex w-full items-baseline gap-4 border-t border-rule py-2.5 text-left transition-colors hover:bg-paper/[0.04]"
                  >
                    <span className="font-mono text-[12px] text-stone">
                      No. {id}
                    </span>
                    <span className="ml-auto font-mono text-[12px] text-emerald-bright">
                      →
                    </span>
                  </button>
                </li>
              ))}
              <li className="border-t border-emphasis" />
            </ul>
          </div>
        )}
      </CardBody>
    </div>
  );
}
