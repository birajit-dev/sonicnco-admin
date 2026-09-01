import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

const tones: Record<Tone, string> = {
  neutral: "border-line-strong bg-surface-3 text-ink-muted",
  brand: "border-brand/35 bg-brand-soft text-brand",
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-info/30 bg-info-soft text-info",
  accent: "border-accent/30 bg-accent-soft text-accent",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  const dotTones: Record<Tone, string> = {
    neutral: "bg-ink-subtle",
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
    accent: "bg-accent",
  };
  return (
    <span
      className={cn("size-1.5 rounded-full", dotTones[tone])}
      aria-hidden
    />
  );
}
