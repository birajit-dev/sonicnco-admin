import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface",
        interactive &&
          "transition-colors duration-200 hover:border-line-strong hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 border-b border-line p-5", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  as: Tag = "h3",
  ...props
}: ComponentProps<"h3"> & { as?: "h2" | "h3" | "h4" }) {
  return (
    <Tag
      className={cn("text-base font-semibold text-ink", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-ink-muted", className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-line bg-surface-2 px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: "brand" | "success" | "info" | "warning";
}) {
  const accentClasses = {
    brand: "bg-brand-soft text-brand",
    success: "bg-success-soft text-success",
    info: "bg-info-soft text-info",
    warning: "bg-warning-soft text-warning",
  } as const;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-ink-muted">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg",
              accentClasses[accent ?? "brand"],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
