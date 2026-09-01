import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "group inline-flex items-baseline rounded-md transition-opacity hover:opacity-90",
        className,
      )}
      aria-label="Sonic & Co Admin home"
    >
      <span className="font-display text-[1.125rem] font-extrabold uppercase leading-none tracking-[-0.04em] text-ink sm:text-[1.25rem]">
        Sonic
        <span className="mx-[0.12em] text-brand">&amp;</span>
        Co
      </span>
    </Link>
  );
}
