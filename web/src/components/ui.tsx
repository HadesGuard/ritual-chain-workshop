"use client";

import { useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import type { TxState } from "@/hooks/useWriteTx";

/* ---------------------------------------------------- Card = ruled section */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t border-rule ${className}`}>{children}</section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  index,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Optional hanging mono index, e.g. "02". */
  index?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 pt-6">
      <div className="flex min-w-0 gap-4">
        {index ? (
          <span className="mt-1.5 font-mono text-[11px] tracking-[0.08em] text-stone">
            {index}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-serif text-[21px] font-medium leading-tight text-paper">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`pb-10 pt-4 ${className}`}>{children}</div>;
}

/* ---------------------------------------- Panel = bordered action container */

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-rule p-5 ${className}`}>{children}</div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-paper">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1 text-[13px] leading-snug text-stone">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* --------------------------------------------------------- Kicker / labels */

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-stone">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ Badge / Stamp */

type Tone = "green" | "amber" | "indigo" | "zinc" | "red";

const STAMP: Record<Tone, string> = {
  green: "border-emerald/60 text-emerald-bright bg-emerald/10",
  amber: "border-gilt/60 text-gilt bg-gilt/10",
  red: "border-seal/60 text-seal bg-seal/10",
  zinc: "border-rule text-stone",
  // The app's only inverted element (AI PICK / pending). Zero violet.
  indigo: "border-paper bg-paper text-ink",
};

export function Badge({
  children,
  tone = "zinc",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-[3px] font-mono text-[11px] uppercase tracking-[0.08em] ${STAMP[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- Button */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[2px] font-mono text-[12px] uppercase tracking-[0.08em] transition-colors duration-150 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    primary:
      "h-9 px-4 bg-emerald text-paper hover:bg-[#15583c] disabled:bg-emerald/30 disabled:text-paper/50",
    secondary:
      "h-9 px-4 border border-paper/25 text-paper hover:bg-paper/5 disabled:text-mute disabled:border-rule",
    ghost:
      "text-emerald-bright underline decoration-emerald-bright/40 underline-offset-4 hover:decoration-emerald-bright disabled:text-mute disabled:no-underline",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* ----------------------------------------------------------- Form fields */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block font-mono text-[11px] text-mute">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-[2px] border border-paper/20 bg-well px-3 py-2 text-[15px] text-paper placeholder:text-mute focus:border-emerald-bright focus:outline-none focus:ring-1 focus:ring-emerald-bright";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`${inputBase} resize-y ${props.className ?? ""}`}
    />
  );
}

/* ---------------------------------------------------------- Tx status UI */

const TX_LABEL: Record<TxState, string> = {
  idle: "",
  wallet: "AWAITING SIGNATURE",
  pending: "PENDING",
  confirmed: "CONFIRMED",
  failed: "FAILED",
};

const TX_TONE: Record<TxState, Tone> = {
  idle: "zinc",
  wallet: "amber",
  pending: "indigo",
  confirmed: "green",
  failed: "red",
};

export function TxStatus({
  state,
  error,
  hash,
  explorerBase,
}: {
  state: TxState;
  error?: string | null;
  hash?: `0x${string}`;
  explorerBase?: string;
}) {
  if (state === "idle" && !error) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[12px]">
      <Badge tone={TX_TONE[state]}>
        {(state === "wallet" || state === "pending") && <Spinner />}
        {TX_LABEL[state]}
      </Badge>
      {state === "failed" && error ? (
        <span className="break-words text-seal">{error}</span>
      ) : null}
      {hash && explorerBase ? (
        <a
          href={`${explorerBase}/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-bright underline decoration-emerald-bright/40 underline-offset-4 hover:decoration-emerald-bright"
        >
          VIEW TX ↗
        </a>
      ) : null}
    </div>
  );
}

export function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export function Notice({
  tone = "zinc",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  const border: Record<Tone, string> = {
    green: "border-emerald/60 bg-emerald/[0.06] text-emerald-bright",
    amber: "border-gilt/60 bg-gilt/[0.06] text-gilt",
    red: "border-seal/60 bg-seal/[0.06] text-seal",
    zinc: "border-rule bg-paper/[0.03] text-stone",
    indigo: "border-paper/40 bg-paper/[0.04] text-paper",
  };
  return (
    <div
      className={`border px-3 py-2 font-mono text-[12px] leading-relaxed ${border[tone]}`}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-t border-rule pt-2">
      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-stone">
        {label}
      </div>
      <div className="mt-0.5 break-words font-mono text-[15px] text-paper">
        {value}
      </div>
    </div>
  );
}

/* ---------------------------------------------------- Copyable mono value */

export function CopyText({
  value,
  display,
  className = "",
}: {
  value: string;
  display?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          },
          () => {},
        );
      }}
      className={`font-mono underline decoration-dotted decoration-mute underline-offset-4 transition-colors hover:decoration-paper ${className}`}
      title="Copy"
    >
      {copied ? "COPIED" : (display ?? value)}
    </button>
  );
}

/* --------------------------------------------------------------- Skeleton */

export function SkeletonBar({ className = "" }: { className?: string }) {
  return <span className={`inline-block animate-pulse bg-paper/[0.08] ${className}`} />;
}
