"use client";

import { useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import type { TxState } from "@/hooks/useWriteTx";

/* ----------------------------------------------------------- primitives */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[14px] border border-line bg-surface ${className}`}>
      {children}
    </section>
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
  index?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-baseline gap-3">
        {index ? <Mono className="text-muted">{index}</Mono> : null}
        <div className="min-w-0">
          <h2 className="text-[22px] font-medium leading-tight tracking-[-0.01em] text-ink">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[14px] leading-normal text-text2">{subtitle}</p>
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
  return <div className={className}>{children}</div>;
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[14px] border border-line bg-surface ${className}`}>
      {children}
    </div>
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
        <h3 className="text-[18px] font-medium leading-snug text-ink">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-[13.5px] leading-normal text-text2">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Uppercase IBM Plex Mono micro-label. */
export function Mono({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-[0.16em] ${className}`}
    >
      {children}
    </span>
  );
}
export const Kicker = Mono;

/* ---------------------------------------------------------------- badge */

type Tone = "green" | "amber" | "indigo" | "zinc" | "red";

const BADGE: Record<Tone, string> = {
  indigo: "bg-indigo text-indigo-tint",
  green: "bg-green text-green-tint",
  amber: "bg-amber-tint text-amber-text border border-amber",
  red: "bg-wax text-wax-tint",
  zinc: "bg-line text-muted",
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] ${BADGE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- button */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "brand" | "dark" | "green";
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 text-[14px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles: Record<string, string> = {
    primary:
      "rounded-[12px] border border-indigo-deep bg-indigo px-6 py-3.5 text-white shadow-[0_6px_18px_rgba(16,24,40,0.10)] hover:brightness-[1.06]",
    brand:
      "rounded-[12px] border border-indigo-deep bg-indigo px-6 py-3.5 text-white shadow-[0_6px_18px_rgba(16,24,40,0.10)] hover:brightness-[1.06]",
    dark: "rounded-[14px] bg-panel px-6 py-3.5 text-indigo-tint2 hover:brightness-125",
    green:
      "rounded-[12px] border border-green-deep bg-green px-6 py-3.5 text-green-tint hover:brightness-[1.06]",
    secondary:
      "rounded-[14px] border border-line bg-surface px-6 py-3.5 text-ink shadow-[0_6px_18px_rgba(16,24,40,0.06)] hover:bg-bg",
    ghost: "font-mono text-[12px] text-muted hover:text-ink",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* ----------------------------------------------------------- form parts */

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
      <Mono className="mb-2.5 block tracking-[0.16em] text-muted">{label}</Mono>
      {children}
      {hint ? (
        <span className="mt-2 block text-[12px] italic text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-[14px] border border-line bg-surface px-4 py-3 text-[14px] text-ink outline-none placeholder:text-muted focus:border-indigo";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`${inputBase} resize-y leading-[1.6] ${props.className ?? ""}`}
    />
  );
}

/* ------------------------------------------------------------- tx status */

const TX_LABEL: Record<TxState, string> = {
  idle: "",
  wallet: "Confirm in your wallet",
  pending: "Pending on-chain",
  confirmed: "Confirmed",
  failed: "Failed",
};

const TX_TONE: Record<TxState, Tone> = {
  idle: "zinc",
  wallet: "indigo",
  pending: "amber",
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
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
      <Badge tone={TX_TONE[state]}>
        {(state === "wallet" || state === "pending") && <Spinner />}
        {TX_LABEL[state]}
      </Badge>
      {state === "failed" && error ? (
        <span className="break-words text-wax">{error}</span>
      ) : null}
      {hash && explorerBase ? (
        <a
          href={`${explorerBase}/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[12px] text-indigo hover:underline"
        >
          view tx ⧉
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
  const styles: Record<Tone, string> = {
    green: "bg-green-tint text-green-deep border-green",
    amber: "bg-amber-tint text-amber-text2 border-amber",
    red: "bg-red-tint text-wax border-red-soft",
    zinc: "bg-bg text-text2 border-line",
    indigo: "bg-indigo-tint text-indigo-deep border-indigo-soft",
  };
  return (
    <div className={`rounded-[12px] border px-4 py-3 text-[13px] leading-relaxed ${styles[tone]}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <Mono className="text-[9px] tracking-[0.1em] text-muted">{label}</Mono>
      <div className="mt-1.5 break-words font-mono text-[13px] text-ink">{value}</div>
    </div>
  );
}

/* --------------------------------------------------------- copyable value */

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
      className={`font-mono text-indigo transition hover:brightness-110 ${className}`}
      title="Copy"
    >
      {copied ? "copied" : (display ?? value)} ⧉
    </button>
  );
}

export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block animate-pulse rounded bg-line ${className}`} />
  );
}
