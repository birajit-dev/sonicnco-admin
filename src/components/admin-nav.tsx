"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeIndianRupee,
  BarChart3,
  Building2,
  CalendarRange,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Mic2,
  Music,
  Newspaper,
  RadioTower,
  ScrollText,
  Search,
  Settings,
  Shield,
  Tag,
  Wallet,
  Waves,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { clearToken } from "@/lib/api";

const navGroups: {
  title: string;
  items: { label: string; href: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Artists", href: "/artists", icon: Mic2 },
      { label: "Production Companies", href: "/companies", icon: Building2 },
      { label: "Songs", href: "/songs", icon: Music },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Blog posts", href: "/blogs", icon: Newspaper },
      { label: "Homepage artists", href: "/featured-artists", icon: Mic2 },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Royalties", href: "/royalties", icon: BadgeIndianRupee },
      { label: "Monthly balances", href: "/royalties/balances", icon: Wallet },
      { label: "Monthly report", href: "/royalties/monthly", icon: CalendarRange },
      { label: "Earnings lookup", href: "/royalties/lookup", icon: Search },
      { label: "Payouts", href: "/payouts", icon: IndianRupee },
      { label: "Pricing", href: "/pricing", icon: Tag },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "DSP revenue upload", href: "/streams", icon: Waves },
    ],
  },
  {
    title: "Delivery",
    items: [
      { label: "Distribution ops", href: "/distribution", icon: RadioTower },
      { label: "PDL email templates", href: "/pdl-templates", icon: Mail },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "KYC", href: "/kyc", icon: Shield },
      { label: "Agreements", href: "/agreements", icon: FileText },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Audit", href: "/audit", icon: ScrollText },
    ],
  },
];

function NavLinks({ pathname }: { pathname: string }) {
  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/royalties") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav aria-label="Admin navigation" className="space-y-6">
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
            {group.title}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] transition-colors",
                      active
                        ? "bg-brand-soft font-medium text-brand"
                        : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);

  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-50 flex h-16 items-center justify-between gap-4 border-b border-line bg-canvas px-5 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid size-10 place-items-center rounded-lg border border-line text-ink-muted"
        >
          {open ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Menu className="size-5" aria-hidden />
          )}
        </button>
      </div>

      {open ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-line bg-canvas p-5 lg:hidden">
          <NavLinks pathname={pathname} />
          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface-2 p-5 lg:flex">
        <Logo />
        <p className="mt-1 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-ink-subtle">
          Admin
        </p>

        <div className="mt-8 flex-1 overflow-y-auto">
          <NavLinks pathname={pathname} />
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-center gap-2.5 px-1">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-[0.6875rem] font-semibold text-white"
              aria-hidden
            >
              AD
            </span>
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-medium text-ink">
                Admin
              </p>
              <p className="text-[0.6875rem] text-ink-subtle">Operations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
