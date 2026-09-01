import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "rounded-full bg-cta text-ink font-semibold hover:bg-cta-strong",
  secondary:
    "rounded-full bg-surface-2 text-ink border border-line-strong hover:bg-surface-3",
  outline:
    "rounded-full border border-line-strong bg-surface text-ink hover:bg-surface-2 hover:border-ink-subtle",
  ghost: "rounded-full bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink",
  danger:
    "rounded-full bg-danger-soft text-danger border border-danger/30 hover:bg-danger/15",
  success:
    "rounded-full bg-success-soft text-success border border-success/30 hover:bg-success/15",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-[0.9375rem]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: Omit<CommonProps, "children">) {
  return cn(
    base,
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className,
  );
}

type ButtonProps = CommonProps &
  Omit<ComponentProps<"button">, "className" | "children">;

export function Button({
  variant,
  size,
  fullWidth,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = CommonProps & ComponentProps<typeof Link>;

export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </Link>
  );
}
