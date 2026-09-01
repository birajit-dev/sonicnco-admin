import type { ComponentProps, ReactNode } from "react";
import { AlertCircle, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle transition-colors duration-150 hover:border-ink-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70 aria-invalid:border-danger aria-invalid:ring-danger/20";

export function Label({
  className,
  required,
  children,
  ...props
}: ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      className={cn("text-[0.8125rem] font-medium text-ink", className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(control, "min-h-28 resize-y py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          control,
          "h-10 cursor-pointer appearance-none pr-10",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
        aria-hidden
      />
    </div>
  );
}

export function Checkbox({
  className,
  label,
  id,
  ...props
}: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="relative mt-0.5 grid size-4.5 shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          className={cn(
            "peer size-4.5 cursor-pointer appearance-none rounded-sm border border-line-strong bg-surface transition-colors checked:border-brand checked:bg-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <Check
          className="pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden
        />
      </span>
      <label
        htmlFor={id}
        className="cursor-pointer text-[0.8125rem] leading-relaxed text-ink-muted"
      >
        {label}
      </label>
    </div>
  );
}

export function FormMessage({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: ReactNode;
}) {
  const tones = {
    success: "border-success/30 bg-success-soft text-success",
    error: "border-danger/30 bg-danger-soft text-danger",
    info: "border-info/30 bg-info-soft text-info",
  } as const;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-4 py-3 text-[0.8125rem] leading-relaxed",
        tones[tone],
      )}
    >
      {tone === "success" ? (
        <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      <div>{children}</div>
    </div>
  );
}
