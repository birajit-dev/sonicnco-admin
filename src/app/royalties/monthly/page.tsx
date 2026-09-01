"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeIndianRupee,
  ChevronDown,
  ChevronRight,
  Disc3,
  RefreshCw,
  Search,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatINR, formatNumber, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Summary = {
  period: string;
  songs: number;
  lines: number;
  streams: number;
  grossPaise: number;
  artistSharePaise: number;
  platformSharePaise: number;
  freeArtistSharePaise: number;
  premiumArtistSharePaise: number;
};

type Line = {
  releaseId: string;
  title: string;
  primaryArtist: string;
  artworkUrl: string | null;
  genre: string;
  distributionTier: string;
  premiumUpgradedAt: string | null;
  userId: string;
  userName: string;
  email: string;
  tier: "free" | "premium";
  streams: number;
  grossPaise: number;
  artistSharePaise: number;
  platformSharePaise: number;
  artistShareBps: number;
  platformShareBps: number;
  periodStart: string;
  periodEnd: string;
  statementId: string;
  statementStatus: string;
};

type SongGroup = {
  releaseId: string;
  head: Line;
  lines: Line[];
  streams: number;
  grossPaise: number;
  artistSharePaise: number;
  platformSharePaise: number;
  hasSplit: boolean;
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period: string) {
  const [y, m] = period.split("-");
  if (!y || !m) return period;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(date);
}

export default function MonthlyRoyaltyReportPage() {
  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState(currentPeriod());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Line[]>([]);
  const [tierFilter, setTierFilter] = useState<"all" | "free" | "premium">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function loadPeriods() {
    const res = await api<{ periods: string[] }>("/admin/royalties/meta/periods");
    if (res.ok) {
      const list = res.data.periods ?? [];
      setPeriods(list);
      if (list.length && !list.includes(period)) {
        setPeriod(list[0]!);
        return list[0]!;
      }
    }
    return period;
  }

  async function loadReport(p = period) {
    const res = await api<{ summary: Summary; items: Line[] | null }>(
      `/admin/royalties/report?period=${encodeURIComponent(p)}`,
    );
    if (!res.ok) {
      setError(res.error);
      setSummary(null);
      setItems([]);
      return;
    }
    setError(null);
    setSummary(res.data.summary);
    setItems(res.data.items ?? []);
    setExpanded(new Set());
  }

  useEffect(() => {
    void loadPeriods().then((p) => loadReport(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function rebuild() {
    setRebuilding(true);
    setError(null);
    const res = await api<{ summary: Summary; items: Line[] | null }>("/admin/royalties/rebuild", {
      method: "POST",
      body: { period },
    });
    setRebuilding(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSummary(res.data.summary);
    setItems(res.data.items ?? []);
  }

  const groups = useMemo(() => {
    const map = new Map<string, SongGroup>();
    for (const line of items) {
      if (tierFilter !== "all" && line.tier !== tierFilter) continue;
      const existing = map.get(line.releaseId);
      if (!existing) {
        map.set(line.releaseId, {
          releaseId: line.releaseId,
          head: line,
          lines: [line],
          streams: line.streams,
          grossPaise: line.grossPaise,
          artistSharePaise: line.artistSharePaise,
          platformSharePaise: line.platformSharePaise,
          hasSplit: false,
        });
      } else {
        existing.lines.push(line);
        existing.streams += line.streams;
        existing.grossPaise += line.grossPaise;
        existing.artistSharePaise += line.artistSharePaise;
        existing.platformSharePaise += line.platformSharePaise;
        existing.hasSplit = existing.lines.some((l) => l.tier === "free") && existing.lines.some((l) => l.tier === "premium");
      }
    }
    let list = Array.from(map.values());
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          g.head.title.toLowerCase().includes(q) ||
          g.head.primaryArtist.toLowerCase().includes(q) ||
          g.head.userName.toLowerCase().includes(q) ||
          g.head.email.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => b.artistSharePaise - a.artistSharePaise);
    return list;
  }, [items, tierFilter, query]);

  const artistPct = summary && summary.grossPaise > 0
    ? Math.round((summary.artistSharePaise / summary.grossPaise) * 100)
    : 0;
  const freePct =
    summary && summary.artistSharePaise > 0
      ? Math.round((summary.freeArtistSharePaise / summary.artistSharePaise) * 100)
      : 0;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const periodList = periods.length ? periods : [period];

  return (
    <AuthGate>
      <PageHeader
        title="Monthly ledger"
        description="Period-based royalty ledger with free/premium segment splits. Mid-month upgrades never rewrite earlier months."
        breadcrumbs={[
          { label: "Royalties", href: "/royalties" },
          { label: "Monthly ledger" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/royalties" size="sm" variant="ghost">
              Statements
            </ButtonLink>
            <ButtonLink href="/royalties/lookup" size="sm" variant="outline">
              Lookup
            </ButtonLink>
            <Button type="button" variant="secondary" size="sm" onClick={() => void rebuild()} disabled={rebuilding}>
              <RefreshCw className={`size-4 ${rebuilding ? "animate-spin" : ""}`} />
              Rebuild
            </Button>
          </div>
        }
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      {/* Period timeline */}
      <div className="mb-5 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/70 px-4 py-2.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Reporting period
          </p>
          <p className="font-mono text-xs text-ink-muted">{period}</p>
        </div>
        <div className="flex gap-1 overflow-x-auto p-2">
          {periodList.map((p) => {
            const active = p === period;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p);
                  void loadReport(p);
                }}
                className={cn(
                  "shrink-0 rounded-lg px-3.5 py-2.5 text-left transition-colors",
                  active
                    ? "bg-brand text-white shadow-sm"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <span className="block text-[0.8125rem] font-semibold">{periodLabel(p)}</span>
                <span className={cn("block font-mono text-[0.625rem]", active ? "text-white/70" : "text-ink-subtle")}>
                  {p}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Financial strip */}
      {summary ? (
        <div className="mb-5 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Gross collections", value: formatINR(summary.grossPaise), sub: `${formatNumber(summary.streams)} streams` },
              { label: "Artist payout pool", value: formatINR(summary.artistSharePaise), sub: `${artistPct}% of gross` },
              { label: "Sonic & Co share", value: formatINR(summary.platformSharePaise), sub: `${100 - artistPct}% of gross` },
              { label: "Songs booked", value: formatNumber(summary.songs), sub: `${formatNumber(summary.lines)} ledger lines` },
            ].map((cell, i) => (
              <div
                key={cell.label}
                className={cn(
                  "px-5 py-4",
                  i > 0 && "border-t border-line sm:border-t-0 sm:border-l",
                )}
              >
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                  {cell.label}
                </p>
                <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-ink">
                  {cell.value}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{cell.sub}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-line bg-surface-2/50 px-5 py-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
              <span>Artist share mix this month</span>
              <span>
                Free {formatINR(summary.freeArtistSharePaise)} · Premium{" "}
                {formatINR(summary.premiumArtistSharePaise)}
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="bg-ink-muted/70 transition-all"
                style={{ width: `${freePct}%` }}
                title="Free tier artist share"
              />
              <div
                className="bg-brand transition-all"
                style={{ width: `${Math.max(0, 100 - freePct)}%` }}
                title="Premium tier artist share"
              />
            </div>
            <div className="mt-2 flex gap-4 text-[0.6875rem] text-ink-subtle">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-ink-muted/70" /> Free 60/40
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand" /> Premium 90/10
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-line bg-surface p-1">
          {(
            [
              { id: "all", label: "All segments" },
              { id: "free", label: "Free 60/40" },
              { id: "premium", label: "Premium 90/10" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTierFilter(tab.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors",
                tierFilter === tab.id
                  ? "bg-surface-3 font-medium text-ink"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter songs, artists, owners…"
            className="h-9 pl-9"
          />
        </div>
      </div>

      {!groups.length && !error ? (
        <EmptyState
          icon={<BadgeIndianRupee className="size-6" />}
          title="No ledger lines for this period"
          description="Rebuild the month after seeding, or pick another period from the timeline."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                  <th className="w-8 px-3 py-3" />
                  <th className="px-3 py-3">Song</th>
                  <th className="hidden px-3 py-3 md:table-cell">Owner</th>
                  <th className="px-3 py-3 text-right">Streams</th>
                  <th className="px-3 py-3 text-right">Gross</th>
                  <th className="px-3 py-3 text-right">Artist</th>
                  <th className="hidden px-3 py-3 text-right lg:table-cell">Platform</th>
                  <th className="px-3 py-3">Split</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {groups.map((g) => {
                  const open = expanded.has(g.releaseId);
                  return (
                    <Fragment key={g.releaseId}>
                      <tr
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-surface-2/80",
                          open && "bg-surface-2/50",
                        )}
                        onClick={() => toggle(g.releaseId)}
                      >
                        <td className="px-3 py-3 align-middle text-ink-subtle">
                          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-surface-3 ring-1 ring-line">
                              {g.head.artworkUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={g.head.artworkUrl} alt="" className="size-full object-cover" />
                              ) : (
                                <div className="grid size-full place-items-center text-ink-subtle">
                                  <Disc3 className="size-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/songs/${g.releaseId}`}
                                className="block truncate text-[0.875rem] font-semibold text-ink hover:text-brand"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {g.head.title}
                              </Link>
                              <p className="truncate text-[0.75rem] text-ink-muted">
                                {g.head.primaryArtist}
                                {g.head.genre ? ` · ${g.head.genre}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-3 py-3 align-middle md:table-cell">
                          <p className="text-[0.8125rem] text-ink">{g.head.userName}</p>
                          <p className="text-[0.6875rem] text-ink-subtle">{g.head.email}</p>
                        </td>
                        <td className="px-3 py-3 align-middle text-right font-mono text-[0.8125rem] tabular-nums text-ink">
                          {formatNumber(g.streams)}
                        </td>
                        <td className="px-3 py-3 align-middle text-right font-mono text-[0.8125rem] tabular-nums text-ink">
                          {formatINR(g.grossPaise)}
                        </td>
                        <td className="px-3 py-3 align-middle text-right font-mono text-[0.8125rem] font-semibold tabular-nums text-ink">
                          {formatINR(g.artistSharePaise)}
                        </td>
                        <td className="hidden px-3 py-3 align-middle text-right font-mono text-[0.8125rem] tabular-nums text-ink-muted lg:table-cell">
                          {formatINR(g.platformSharePaise)}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          {g.hasSplit ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-warning">
                              Mid-month split
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "inline-flex rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold",
                                g.head.tier === "premium"
                                  ? "bg-brand-soft text-brand"
                                  : "bg-surface-3 text-ink-muted",
                              )}
                            >
                              {g.head.tier === "premium" ? "90 / 10" : "60 / 40"}
                            </span>
                          )}
                        </td>
                      </tr>
                      {open
                        ? g.lines.map((line, idx) => (
                            <tr key={`${g.releaseId}-${line.tier}-${idx}`} className="bg-surface-2/40">
                              <td className="px-3 py-2.5" />
                              <td className="px-3 py-2.5 pl-16" colSpan={2}>
                                <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
                                  <span
                                    className={cn(
                                      "rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                                      line.tier === "premium"
                                        ? "bg-brand-soft text-brand"
                                        : "bg-surface-3 text-ink-muted",
                                    )}
                                  >
                                    {line.tier}
                                  </span>
                                  <span className="text-ink-subtle">
                                    {formatDate(line.periodStart)} → {formatDate(line.periodEnd)}
                                  </span>
                                  <span className="text-ink-muted">
                                    {line.artistShareBps / 100}% / {line.platformShareBps / 100}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-[0.75rem] tabular-nums text-ink-muted">
                                {formatNumber(line.streams)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-[0.75rem] tabular-nums text-ink-muted">
                                {formatINR(line.grossPaise)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-[0.75rem] font-medium tabular-nums text-ink">
                                {formatINR(line.artistSharePaise)}
                              </td>
                              <td className="hidden px-3 py-2.5 text-right font-mono text-[0.75rem] tabular-nums text-ink-subtle lg:table-cell">
                                {formatINR(line.platformSharePaise)}
                              </td>
                              <td className="px-3 py-2.5" />
                            </tr>
                          ))
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-ink-subtle">
            <span>
              {formatNumber(groups.length)} song{groups.length === 1 ? "" : "s"}
              {query || tierFilter !== "all" ? " (filtered)" : ""} · click a row to expand segments
            </span>
            <span className="hidden sm:inline">
              Free → premium mid-month creates two ledger lines so history stays intact
            </span>
          </div>
        </div>
      )}
    </AuthGate>
  );
}
