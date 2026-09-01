"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Disc3,
  Mic2,
  Wallet,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type PlatformRow = {
  store: string;
  streams: number;
  revenuePaise?: number;
  grossPaise?: number;
  tier?: string;
};

type SegmentRow = {
  tier: string;
  streams: number;
  grossPaise: number;
  artistSharePaise: number;
  platformSharePaise: number;
  artistShareBps: number;
  platformShareBps: number;
  periodStart: string;
  periodEnd: string;
};

type SongRow = {
  releaseId: string;
  title: string;
  primaryArtist: string;
  artworkUrl: string | null;
  genre: string;
  status: string;
  distributionTier: string;
  premiumUpgradedAt: string | null;
  artistShareBps: number;
  thisMonthArtistPaise: number;
  thisMonthGrossPaise: number;
  thisMonthStreams: number;
  lifetimeArtistPaise: number;
  lifetimeGrossPaise: number;
  lifetimeStreams: number;
  analyticsStreams: number;
  analyticsRevenue: number;
  stores: PlatformRow[];
  segments: SegmentRow[];
};

type StatementRow = {
  id: string | null;
  period: string;
  grossPaise: number;
  platformSharePaise: number;
  artistSharePaise: number;
  streams: number;
  status: string;
  breakdown: PlatformRow[];
};

type PayoutRow = {
  id: string;
  reference: string;
  amountPaise: number;
  method: string;
  destination: string;
  status: string;
  requestedAt: string;
};

type Profile = {
  user: {
    id: string;
    role: string;
    accountType: string;
    name: string;
    artistName: string;
    companyName: string | null;
    displayName: string;
    email: string;
    phone: string | null;
    country: string;
    plan: string | null;
    kycStatus: string;
    status: string;
    createdAt: string;
  };
  wallet: {
    thisMonthArtistPaise: number;
    thisMonthGrossPaise: number;
    thisMonthStreams: number;
    lifetimeArtistPaise: number;
    lifetimeGrossPaise: number;
    lifetimeStreams: number;
    availableBalancePaise: number;
    processingBalancePaise: number;
    paidOutPaise: number;
    pendingPayoutPaise: number;
    payoutAvailablePaise: number;
    minPayoutPaise: number;
    releaseCount: number;
    liveCount: number;
  };
  period: string;
  periods: string[];
  monthly: StatementRow;
  periodSummary: {
    artistSharePaise: number;
    grossPaise: number;
    streams: number;
    platformSharePaise: number;
    songCount: number;
    status: string;
  };
  songs: SongRow[];
  platforms: PlatformRow[];
  lifetimePlatforms: PlatformRow[];
  statements: StatementRow[];
  payouts: PayoutRow[];
};

function statusTone(s: string) {
  if (s === "active" || s === "live" || s === "available" || s === "paid" || s === "completed") {
    return "success" as const;
  }
  if (s === "suspended" || s === "rejected") return "danger" as const;
  if (s === "processing" || s === "requested" || s === "pending" || s === "approved") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function periodLabel(period: string) {
  const [y, m] = period.split("-");
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(
    new Date(Number(y), Number(m) - 1, 1),
  );
}

function storeAmount(p: PlatformRow) {
  return p.revenuePaise ?? p.grossPaise ?? 0;
}

function artistShareForStore(p: PlatformRow, song: SongRow) {
  const gross = storeAmount(p);
  if (p.tier === "premium") return Math.round((gross * 9000) / 10000);
  if (p.tier === "free") return Math.round((gross * 6000) / 10000);
  return Math.round((gross * song.artistShareBps) / 10000);
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<Profile | null>(null);
  const [period, setPeriod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"month" | "catalogue" | "history" | "payouts">("month");

  async function load(p?: string) {
    const qs = p ? `?period=${encodeURIComponent(p)}` : "";
    const res = await api<Profile>(`/admin/users/${id}${qs}`);
    if (!res.ok) {
      setError(res.error);
      setData(null);
      return;
    }
    setError(null);
    setData(res.data);
    setPeriod(res.data.period);
    setExpanded(new Set());
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleStatus() {
    if (!data) return;
    const next = data.user.status === "active" ? "suspended" : "active";
    const res = await api(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: { status: next },
    });
    if (!res.ok) setError(res.error);
    else void load(period);
  }

  const monthSongs = useMemo(() => {
    if (!data) return [];
    return data.songs.filter(
      (s) =>
        s.thisMonthStreams > 0 ||
        s.thisMonthArtistPaise > 0 ||
        s.stores.length > 0 ||
        s.segments.length > 0,
    );
  }, [data]);

  const maxPlatformStreams = useMemo(() => {
    const list = data?.platforms ?? [];
    if (!list.length) return 1;
    return Math.max(...list.map((p) => p.streams), 1);
  }, [data]);

  function toggleSong(releaseId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(releaseId)) next.delete(releaseId);
      else next.add(releaseId);
      return next;
    });
  }

  if (!data && !error) {
    return (
      <AuthGate>
        <p className="text-sm text-ink-muted">Loading account…</p>
      </AuthGate>
    );
  }

  if (error || !data) {
    return (
      <AuthGate>
        <EmptyState
          icon={<Mic2 className="size-6" />}
          title="Account not found"
          description={error ?? "This artist or production company could not be loaded."}
        />
      </AuthGate>
    );
  }

  const { user, wallet, monthly, periodSummary } = data;
  const isCompany = user.accountType === "production_company";
  const listHref = isCompany ? "/companies" : "/artists";
  const listLabel = isCompany ? "Production companies" : "Artists";
  const periodList = data.periods?.length ? data.periods : [data.period];

  return (
    <AuthGate>
      <PageHeader
        title={user.displayName}
        description={`${user.email}${user.plan ? ` · ${user.plan}` : ""} · joined ${formatDate(user.createdAt)}`}
        breadcrumbs={[
          { label: listLabel, href: listHref },
          { label: user.displayName },
        ]}
        actions={
          <Button
            variant={user.status === "active" ? "danger" : "success"}
            size="sm"
            onClick={() => void toggleStatus()}
          >
            {user.status === "active" ? "Suspend" : "Activate"}
          </Button>
        }
      />

      {/* Identity + lifetime wallet */}
      <div className="mb-5 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-full bg-brand-soft text-base font-semibold text-brand ring-1 ring-brand/20">
              {initials(user.displayName)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-semibold text-ink">{user.displayName}</h2>
                <Badge tone={statusTone(user.status)}>
                  <Dot tone={statusTone(user.status)} />
                  {user.status}
                </Badge>
                <Badge tone="neutral">
                  {isCompany ? (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3" /> Production
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Mic2 className="size-3" /> Artist
                    </span>
                  )}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-ink-muted">
                {user.name}
                {user.phone ? ` · ${user.phone}` : ""} · {user.country} · KYC {user.kycStatus}
              </p>
            </div>
          </div>
          <div className="text-sm text-ink-muted sm:text-right">
            <p>
              {formatNumber(wallet.releaseCount)} songs · {formatNumber(wallet.liveCount)} live
            </p>
          </div>
        </div>

        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Lifetime earnings",
              value: formatINR(wallet.lifetimeArtistPaise),
              sub: `${formatNumber(wallet.lifetimeStreams)} streams`,
            },
            {
              label: "Available balance",
              value: formatINR(wallet.availableBalancePaise),
              sub: `Processing ${formatINR(wallet.processingBalancePaise)}`,
            },
            {
              label: "Withdrawable",
              value: formatINR(wallet.payoutAvailablePaise),
              sub:
                wallet.pendingPayoutPaise > 0
                  ? `Pending withdrawal ${formatINR(wallet.pendingPayoutPaise)}`
                  : `Min payout ${formatINR(wallet.minPayoutPaise)}`,
            },
            {
              label: "Paid out",
              value: formatINR(wallet.paidOutPaise),
              sub: "Completed withdrawals",
            },
          ].map((cell, i) => (
            <div
              key={cell.label}
              className={cn("px-5 py-4", i > 0 && "border-t border-line sm:border-t-0 sm:border-l")}
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
      </div>

      {/* Period timeline */}
      <div className="mb-5 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/70 px-4 py-2.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Monthly statement period
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
                  void load(p);
                }}
                className={cn(
                  "shrink-0 rounded-lg px-3.5 py-2.5 text-left transition-colors",
                  active ? "bg-brand text-white shadow-sm" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
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

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5 rounded-lg border border-line bg-surface p-1">
        {(
          [
            { id: "month", label: "Monthly statement" },
            { id: "catalogue", label: "Full catalogue", count: data.songs.length },
            { id: "history", label: "All statements", count: data.statements.length },
            { id: "payouts", label: "Withdrawals", count: data.payouts.length },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors",
              tab === t.id ? "bg-surface-3 font-medium text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
            {"count" in t && t.count != null ? (
              <span className="ml-1.5 text-ink-subtle">{t.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "month" ? (
        <div className="space-y-5">
          {/* Month KPI strip */}
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
              <div>
                <p className="font-display text-lg font-semibold text-ink">
                  Statement · {periodLabel(period)}
                </p>
                <p className="text-xs text-ink-muted">
                  Songs, platforms, and free/premium segments for this month
                </p>
              </div>
              <Badge tone={statusTone(String(periodSummary.status))}>
                <Dot tone={statusTone(String(periodSummary.status))} />
                {periodSummary.status === "none" ? "no statement row" : periodSummary.status}
              </Badge>
            </div>
            <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label: "Gross",
                  value: formatINR(Number(periodSummary.grossPaise)),
                  sub: `${formatNumber(periodSummary.songCount)} songs`,
                },
                {
                  label: "Artist share",
                  value: formatINR(Number(periodSummary.artistSharePaise)),
                  sub: "Credited to account",
                },
                {
                  label: "Sonic & Co",
                  value: formatINR(Number(periodSummary.platformSharePaise)),
                  sub: "Platform share",
                },
                {
                  label: "Streams",
                  value: formatNumber(Number(periodSummary.streams)),
                  sub: "All stores",
                },
                {
                  label: "Platforms",
                  value: formatNumber(data.platforms.length),
                  sub: "Active this month",
                },
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
                  <p className="mt-1.5 font-display text-xl font-semibold tabular-nums text-ink">
                    {cell.value}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{cell.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Platforms this month */}
          <section>
            <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              Platforms this month
            </h3>
            {!data.platforms.length ? (
              <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-muted">
                No platform analytics for {periodLabel(period)}.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
                <div className="divide-y divide-line">
                  {data.platforms.map((p) => (
                    <div key={p.store} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-[0.875rem] font-semibold text-ink">{p.store}</p>
                          <div className="text-right">
                            <p className="font-mono text-[0.8125rem] font-semibold tabular-nums text-ink">
                              {formatINR(storeAmount(p))}
                            </p>
                            <p className="text-[0.6875rem] text-ink-subtle">
                              {formatNumber(p.streams)} streams
                            </p>
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-brand transition-all"
                            style={{
                              width: `${Math.max(4, (p.streams / maxPlatformStreams) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {(monthly.breakdown?.length ?? 0) > 0 && monthly.id ? (
                  <div className="border-t border-line bg-surface-2/40 px-5 py-3 text-xs text-ink-subtle">
                    Statement store breakdown also booked:{" "}
                    {monthly.breakdown
                      .map((b) => `${b.store} ${formatINR(storeAmount(b))}`)
                      .join(" · ")}
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {/* Songs this month */}
          <section>
            <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              Songs this month
            </h3>
            {!monthSongs.length ? (
              <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-muted">
                No song earnings booked for {periodLabel(period)}. Rebuild the monthly royalty report if
                statements exist without lines.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="border-b border-line bg-surface-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                        <th className="w-8 px-3 py-3" />
                        <th className="px-3 py-3">Song</th>
                        <th className="px-3 py-3 text-right">Streams</th>
                        <th className="px-3 py-3 text-right">Gross</th>
                        <th className="px-3 py-3 text-right">Artist</th>
                        <th className="px-3 py-3">Split</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {monthSongs.map((song) => {
                        const open = expanded.has(song.releaseId);
                        const hasSplit =
                          song.segments.some((s) => s.tier === "free") &&
                          song.segments.some((s) => s.tier === "premium");
                        return (
                          <Fragment key={song.releaseId}>
                            <tr
                              className={cn(
                                "cursor-pointer transition-colors hover:bg-surface-2/80",
                                open && "bg-surface-2/50",
                              )}
                              onClick={() => toggleSong(song.releaseId)}
                            >
                              <td className="px-3 py-3 text-ink-subtle">
                                {open ? (
                                  <ChevronDown className="size-4" />
                                ) : (
                                  <ChevronRight className="size-4" />
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-surface-3 ring-1 ring-line">
                                    {song.artworkUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={song.artworkUrl}
                                        alt=""
                                        className="size-full object-cover"
                                      />
                                    ) : (
                                      <div className="grid size-full place-items-center text-ink-subtle">
                                        <Disc3 className="size-4" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <Link
                                      href={`/songs/${song.releaseId}`}
                                      className="block truncate text-[0.875rem] font-semibold text-ink hover:text-brand"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {song.title}
                                    </Link>
                                    <p className="truncate text-[0.75rem] text-ink-muted">
                                      {song.primaryArtist}
                                      {song.genre ? ` · ${song.genre}` : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink">
                                {formatNumber(song.thisMonthStreams)}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink-muted">
                                {formatINR(song.thisMonthGrossPaise)}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-[0.8125rem] font-semibold tabular-nums text-ink">
                                {formatINR(song.thisMonthArtistPaise)}
                              </td>
                              <td className="px-3 py-3">
                                {hasSplit ? (
                                  <span className="inline-flex rounded-md bg-warning-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-warning">
                                    Mid-month split
                                  </span>
                                ) : (
                                  <span
                                    className={cn(
                                      "inline-flex rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold",
                                      song.distributionTier === "premium"
                                        ? "bg-brand-soft text-brand"
                                        : "bg-surface-3 text-ink-muted",
                                    )}
                                  >
                                    {song.distributionTier === "premium" ? "90 / 10" : "60 / 40"}
                                  </span>
                                )}
                              </td>
                            </tr>
                            {open ? (
                              <tr className="bg-surface-2/40">
                                <td colSpan={6} className="px-4 py-4">
                                  <div className="grid gap-4 lg:grid-cols-2">
                                    <div>
                                      <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                                        Ledger segments
                                      </p>
                                      {!song.segments.length ? (
                                        <p className="text-sm text-ink-muted">
                                          No royalty lines for this song in {period}. Platform analytics may
                                          still show below.
                                        </p>
                                      ) : (
                                        <div className="overflow-hidden rounded-lg border border-line bg-surface">
                                          <table className="min-w-full text-left text-[0.8125rem]">
                                            <thead className="bg-surface-2 text-ink-muted">
                                              <tr>
                                                <th className="px-3 py-2 font-medium">Tier</th>
                                                <th className="px-3 py-2 font-medium">Dates</th>
                                                <th className="px-3 py-2 text-right font-medium">Streams</th>
                                                <th className="px-3 py-2 text-right font-medium">Artist</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-line">
                                              {song.segments.map((seg, idx) => (
                                                <tr key={`${seg.tier}-${idx}`}>
                                                  <td className="px-3 py-2 capitalize">
                                                    <span
                                                      className={cn(
                                                        "rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase",
                                                        seg.tier === "premium"
                                                          ? "bg-brand-soft text-brand"
                                                          : "bg-surface-3 text-ink-muted",
                                                      )}
                                                    >
                                                      {seg.tier}
                                                    </span>
                                                    <span className="ml-2 text-ink-subtle">
                                                      {seg.artistShareBps / 100}% /{" "}
                                                      {seg.platformShareBps / 100}%
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2 text-ink-subtle">
                                                    {formatDate(seg.periodStart)} →{" "}
                                                    {formatDate(seg.periodEnd)}
                                                  </td>
                                                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                                                    {formatNumber(seg.streams)}
                                                  </td>
                                                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                                                    {formatINR(seg.artistSharePaise)}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                                        By streaming platform
                                      </p>
                                      {!song.stores.length ? (
                                        <p className="text-sm text-ink-muted">
                                          No store-level analytics for this song in {period}.
                                        </p>
                                      ) : (
                                        <div className="overflow-hidden rounded-lg border border-line bg-surface">
                                          <table className="min-w-full text-left text-[0.8125rem]">
                                            <thead className="bg-surface-2 text-ink-muted">
                                              <tr>
                                                <th className="px-3 py-2 font-medium">Platform</th>
                                                {song.stores.some((s) => s.tier) ? (
                                                  <th className="px-3 py-2 font-medium">Tier</th>
                                                ) : null}
                                                <th className="px-3 py-2 text-right font-medium">Streams</th>
                                                <th className="px-3 py-2 text-right font-medium">Gross</th>
                                                <th className="px-3 py-2 text-right font-medium">
                                                  Artist share
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-line">
                                              {song.stores.map((st, idx) => (
                                                <tr key={`${st.store}-${st.tier ?? "all"}-${idx}`}>
                                                  <td className="px-3 py-2 font-medium text-ink">
                                                    {st.store}
                                                  </td>
                                                  {song.stores.some((s) => s.tier) ? (
                                                    <td className="px-3 py-2">
                                                      {st.tier ? (
                                                        <span
                                                          className={cn(
                                                            "rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase",
                                                            st.tier === "premium"
                                                              ? "bg-brand-soft text-brand"
                                                              : "bg-surface-3 text-ink-muted",
                                                          )}
                                                        >
                                                          {st.tier}
                                                        </span>
                                                      ) : (
                                                        <span className="text-ink-subtle">—</span>
                                                      )}
                                                    </td>
                                                  ) : null}
                                                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                                                    {formatNumber(st.streams)}
                                                  </td>
                                                  <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-muted">
                                                    {formatINR(storeAmount(st))}
                                                  </td>
                                                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-ink">
                                                    {formatINR(artistShareForStore(st, song))}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-line px-4 py-3 text-xs text-ink-subtle">
                  Expand a song for free/premium ledger segments and per-platform earnings in{" "}
                  {periodLabel(period)}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === "catalogue" ? (
        !data.songs.length ? (
          <EmptyState
            icon={<Disc3 className="size-6" />}
            title="No songs yet"
            description="Releases owned by this account will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                    <th className="px-3 py-3">Song</th>
                    <th className="px-3 py-3 text-right">Lifetime streams</th>
                    <th className="px-3 py-3 text-right">Lifetime artist</th>
                    <th className="hidden px-3 py-3 text-right md:table-cell">
                      {periodLabel(period)}
                    </th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.songs.map((song) => (
                    <tr key={song.releaseId} className="hover:bg-surface-2/80">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-surface-3 ring-1 ring-line">
                            {song.artworkUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={song.artworkUrl} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="grid size-full place-items-center text-ink-subtle">
                                <Disc3 className="size-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/songs/${song.releaseId}`}
                              className="block truncate text-[0.875rem] font-semibold text-ink hover:text-brand"
                            >
                              {song.title}
                            </Link>
                            <p className="truncate text-[0.75rem] text-ink-muted">
                              {song.primaryArtist}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[0.8125rem] tabular-nums">
                        {formatNumber(Math.max(song.lifetimeStreams, song.analyticsStreams))}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[0.8125rem] font-semibold tabular-nums">
                        {formatINR(
                          song.lifetimeArtistPaise ||
                            Math.round((song.analyticsRevenue * song.artistShareBps) / 10000),
                        )}
                      </td>
                      <td className="hidden px-3 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink-muted md:table-cell">
                        {formatINR(song.thisMonthArtistPaise)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={statusTone(song.status)}>
                          {song.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}

      {tab === "history" ? (
        !data.statements.length ? (
          <EmptyState
            icon={<Wallet className="size-6" />}
            title="No statements"
            description="Monthly royalty statements for this account will show here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3 text-right">Streams</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Artist</th>
                    <th className="px-4 py-3 text-right">Platform</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Stores</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.statements.map((st) => (
                    <tr
                      key={st.id ?? st.period}
                      className={cn(
                        "hover:bg-surface-2/80",
                        st.period === period && "bg-brand-soft/30",
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-[0.8125rem] text-ink">{st.period}</td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums">
                        {formatNumber(st.streams)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink-muted">
                        {formatINR(st.grossPaise)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] font-semibold tabular-nums text-ink">
                        {formatINR(st.artistSharePaise)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink-muted">
                        {formatINR(st.platformSharePaise)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(st.status)}>{st.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[0.75rem] text-ink-muted">
                        {(st.breakdown ?? []).map((b) => b.store).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="text-[0.8125rem] font-medium text-brand hover:underline"
                          onClick={() => {
                            setPeriod(st.period);
                            setTab("month");
                            void load(st.period);
                          }}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}

      {tab === "payouts" ? (
        !data.payouts.length ? (
          <EmptyState
            icon={<Wallet className="size-6" />}
            title="No withdrawals"
            description="Payout requests from this account will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Requested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-2/80">
                      <td className="px-4 py-3">
                        <p className="font-mono text-[0.8125rem] text-ink">{p.reference}</p>
                        <p className="text-[0.6875rem] text-ink-subtle">{p.destination}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] font-semibold tabular-nums">
                        {formatINR(p.amountPaise)}
                      </td>
                      <td className="px-4 py-3 text-[0.8125rem] capitalize text-ink-muted">{p.method}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[0.75rem] text-ink-subtle">
                        {formatDate(p.requestedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}
    </AuthGate>
  );
}
