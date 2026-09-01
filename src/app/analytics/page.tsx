"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Disc3,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { api } from "@/lib/api";
import { formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "@/lib/analytics";

const RANGES = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
] as const;

function periodLabel(period: string) {
  const [y, m] = period.split("-");
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(
    new Date(Number(y), Number(m) - 1, 1),
  );
}

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[0.75rem] font-medium tabular-nums",
        up ? "text-success" : "text-danger",
      )}
    >
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {value.toFixed(1)}% vs last month
    </span>
  );
}

function MiniBars({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={cn("flex h-16 items-end gap-0.5", className)}>
      {values.map((v, i) => (
        <div
          key={i}
          className="min-w-0 flex-1 rounded-t-sm bg-brand/80 transition-all"
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          title={formatNumber(v)}
        />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [busy, setBusy] = useState(false);

  async function load(days = rangeDays) {
    setBusy(true);
    const res = await api<AnalyticsData>(`/admin/analytics?rangeDays=${days}`);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setData(null);
      return;
    }
    setError(null);
    setData(res.data);
  }

  useEffect(() => {
    void load(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overview = data?.overview;
  const platforms = data?.platformBreakdown ?? [];
  const daily = data?.dailyTrend ?? [];
  const months = data?.monthlyTrend ?? [];
  const topSongs = data?.topSongs ?? [];
  const topArtists = data?.topArtists ?? [];
  const statuses = data?.catalogueStatus ?? [];
  const countries = data?.countries ?? [];
  const payouts = data?.payoutsByStatus ?? [];
  const tierMix = data?.tierMix;

  const dailyStreams = useMemo(() => daily.map((d) => d.streams), [daily]);
  const monthlyGross = useMemo(() => months.map((m) => m.grossPaise), [months]);
  const maxPlatform = useMemo(
    () => Math.max(...platforms.map((p) => p.streams), 1),
    [platforms],
  );
  const statusTotal = useMemo(
    () => statuses.reduce((n, s) => n + s.count, 0) || 1,
    [statuses],
  );
  const tierArtistTotal = (tierMix?.freeArtistPaise ?? 0) + (tierMix?.premiumArtistPaise ?? 0);
  const freePct =
    tierArtistTotal > 0 ? Math.round(((tierMix?.freeArtistPaise ?? 0) / tierArtistTotal) * 100) : 0;

  if (error && !data) {
    return (
      <AuthGate>
        <PageHeader title="Analytics" description="Platform performance and catalogue insights." />
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          title="Analytics unavailable"
          description={error}
        />
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <PageHeader
        title="Analytics"
        description="Streams, royalties, catalogue health, and payout activity across Sonic & Co."
        actions={
          <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                disabled={busy}
                onClick={() => {
                  setRangeDays(r.days);
                  void load(r.days);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors",
                  rangeDays === r.days
                    ? "bg-surface-3 font-medium text-ink"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {!overview ? (
        <p className="text-sm text-ink-muted">Loading analytics…</p>
      ) : (
        <div className="space-y-5">
          {/* KPI strip */}
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Lifetime streams",
                  value: formatNumber(overview.totalStreams),
                  sub: (
                    <Delta value={overview.streamsDeltaPct} />
                  ),
                },
                {
                  label: "Lifetime gross",
                  value: formatINR(overview.totalRevenuePaise),
                  sub: <Delta value={overview.revenueDeltaPct} />,
                },
                {
                  label: "Artist share booked",
                  value: formatINR(overview.artistSharePaise),
                  sub: (
                    <span className="text-xs text-ink-muted">
                      Platform {formatINR(overview.platformSharePaise)}
                    </span>
                  ),
                },
                {
                  label: `${overview.rangeDays}D window`,
                  value: formatNumber(overview.rangeStreams),
                  sub: (
                    <span className="text-xs text-ink-muted">
                      {formatINR(overview.rangeRevenuePaise)} revenue
                    </span>
                  ),
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
                  <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-ink">
                    {cell.value}
                  </p>
                  <div className="mt-1">{cell.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* This month vs ops */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card lg:col-span-2">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <div>
                  <p className="font-display text-base font-semibold text-ink">
                    Statement month · {periodLabel(data!.thisPeriod)}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Compared with {periodLabel(data!.lastPeriod)}
                  </p>
                </div>
              </div>
              <div className="grid gap-0 sm:grid-cols-3">
                {[
                  {
                    label: "Streams",
                    value: formatNumber(overview.thisMonthStreams),
                    prev: formatNumber(overview.lastMonthStreams),
                  },
                  {
                    label: "Gross",
                    value: formatINR(overview.thisMonthGrossPaise),
                    prev: formatINR(overview.lastMonthGrossPaise),
                  },
                  {
                    label: "Artist share",
                    value: formatINR(overview.thisMonthArtistPaise),
                    prev: formatINR(overview.lastMonthArtistPaise),
                  },
                ].map((cell, i) => (
                  <div
                    key={cell.label}
                    className={cn("px-5 py-4", i > 0 && "border-t border-line sm:border-t-0 sm:border-l")}
                  >
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                      {cell.label}
                    </p>
                    <p className="mt-1 font-display text-xl font-semibold tabular-nums text-ink">
                      {cell.value}
                    </p>
                    <p className="mt-1 text-xs text-ink-subtle">Prev {cell.prev}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-line px-5 py-4">
                <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                  Daily streams ({overview.rangeDays}D)
                </p>
                {dailyStreams.length ? (
                  <MiniBars values={dailyStreams} />
                ) : (
                  <p className="text-sm text-ink-muted">No daily analytics in this window.</p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <div className="border-b border-line px-5 py-3">
                <p className="font-display text-base font-semibold text-ink">Operations</p>
                <p className="text-xs text-ink-muted">Catalogue & money movement</p>
              </div>
              <div className="divide-y divide-line text-sm">
                {[
                  { label: "Active artists", value: formatNumber(overview.activeArtists) },
                  { label: "Production cos", value: formatNumber(overview.productionCompanies) },
                  { label: "Live songs", value: formatNumber(overview.liveSongs) },
                  { label: "Pending review", value: formatNumber(overview.pendingReviews) },
                  { label: "Open payouts", value: formatNumber(overview.openPayouts) },
                  { label: "Available balance", value: formatINR(overview.availableBalancePaise) },
                  { label: "Paid out", value: formatINR(overview.paidOutPaise) },
                  { label: "Pending withdraw", value: formatINR(overview.pendingPayoutPaise) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-ink-muted">{row.label}</span>
                    <span className="font-mono text-[0.8125rem] font-semibold tabular-nums text-ink">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Platforms + tier mix */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card lg:col-span-3">
              <div className="border-b border-line px-5 py-3">
                <p className="font-display text-base font-semibold text-ink">Platform mix</p>
                <p className="text-xs text-ink-muted">Store-level streams in the selected window</p>
              </div>
              {!platforms.length ? (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">No platform data yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {platforms.map((p) => (
                    <div key={p.platform} className="px-5 py-3.5">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[0.875rem] font-semibold text-ink">{p.platform}</p>
                          <p className="text-[0.6875rem] text-ink-subtle">
                            {p.sharePct.toFixed(1)}% of streams
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[0.8125rem] font-semibold tabular-nums text-ink">
                            {formatNumber(p.streams)}
                          </p>
                          <p className="text-[0.6875rem] text-ink-subtle">
                            {formatINR(p.revenuePaise)}
                          </p>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{
                            width: `${Math.max(4, (p.streams / maxPlatform) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
                <div className="border-b border-line px-5 py-3">
                  <p className="font-display text-base font-semibold text-ink">Free vs premium</p>
                </div>
                <div className="px-5 py-4">
                  <div className="mb-2 flex justify-between text-xs text-ink-muted">
                    <span>Artist share mix</span>
                    <span>
                      Free {formatINR(tierMix?.freeArtistPaise ?? 0)} · Premium{" "}
                      {formatINR(tierMix?.premiumArtistPaise ?? 0)}
                    </span>
                  </div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="bg-ink-muted/70" style={{ width: `${freePct}%` }} />
                    <div className="bg-brand" style={{ width: `${Math.max(0, 100 - freePct)}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[0.6875rem] uppercase tracking-wide text-ink-subtle">Free songs</p>
                      <p className="font-display text-xl font-semibold tabular-nums">
                        {formatNumber(tierMix?.freeSongs ?? overview.freeSongs)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.6875rem] uppercase tracking-wide text-ink-subtle">Premium</p>
                      <p className="font-display text-xl font-semibold tabular-nums">
                        {formatNumber(tierMix?.premiumSongs ?? overview.premiumSongs)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
                <div className="border-b border-line px-5 py-3">
                  <p className="font-display text-base font-semibold text-ink">Catalogue status</p>
                </div>
                <div className="divide-y divide-line">
                  {statuses.map((s) => (
                    <div key={s.status} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex justify-between text-[0.8125rem]">
                          <span className="capitalize text-ink">{s.status.replaceAll("_", " ")}</span>
                          <span className="font-mono tabular-nums text-ink-muted">
                            {formatNumber(s.count)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-ink-muted/50"
                            style={{ width: `${(s.count / statusTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {!statuses.length ? (
                    <p className="px-5 py-6 text-center text-sm text-ink-muted">No releases yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly trend */}
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="border-b border-line px-5 py-3">
              <p className="font-display text-base font-semibold text-ink">12-month ledger trend</p>
              <p className="text-xs text-ink-muted">
                Signups, releases, and royalty statements by month
              </p>
            </div>
            <div className="border-b border-line px-5 py-4">
              {monthlyGross.length ? (
                <MiniBars values={monthlyGross} className="h-20" />
              ) : (
                <p className="text-sm text-ink-muted">No monthly royalty data.</p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">New accounts</th>
                    <th className="px-4 py-3 text-right">New releases</th>
                    <th className="px-4 py-3 text-right">Streams</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Artist</th>
                    <th className="px-4 py-3 text-right">Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...months].reverse().map((m) => (
                    <tr key={m.month} className="hover:bg-surface-2/80">
                      <td className="px-4 py-3 font-mono text-[0.8125rem] text-ink">{m.month}</td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums">
                        {formatNumber(m.artists)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums">
                        {formatNumber(m.releases)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums">
                        {formatNumber(m.streams)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink-muted">
                        {formatINR(m.grossPaise)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] font-semibold tabular-nums">
                        {formatINR(m.artistSharePaise)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink-muted">
                        {formatINR(m.platformSharePaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top songs + artists */}
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <div className="border-b border-line px-5 py-3">
                <p className="font-display text-base font-semibold text-ink">Top songs</p>
                <p className="text-xs text-ink-muted">By streams in the selected window</p>
              </div>
              {!topSongs.length ? (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">No song analytics yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {topSongs.map((song, idx) => (
                    <Link
                      key={song.releaseId}
                      href={`/songs/${song.releaseId}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/80"
                    >
                      <span className="w-5 font-mono text-[0.75rem] text-ink-subtle">{idx + 1}</span>
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
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.875rem] font-semibold text-ink">{song.title}</p>
                        <p className="truncate text-[0.75rem] text-ink-muted">{song.primaryArtist}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[0.8125rem] font-semibold tabular-nums text-ink">
                          {formatNumber(song.streams)}
                        </p>
                        <p className="text-[0.6875rem] text-ink-subtle">
                          {formatINR(song.revenuePaise)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <div className="border-b border-line px-5 py-3">
                <p className="font-display text-base font-semibold text-ink">Top earners</p>
                <p className="text-xs text-ink-muted">Artists & production companies by lifetime share</p>
              </div>
              {!topArtists.length ? (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">No earnings yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {topArtists.map((a, idx) => (
                    <Link
                      key={a.userId}
                      href={`/users/${a.userId}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/80"
                    >
                      <span className="w-5 font-mono text-[0.75rem] text-ink-subtle">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.875rem] font-semibold text-ink">{a.displayName}</p>
                        <p className="truncate text-[0.75rem] text-ink-muted">
                          {a.accountType.replaceAll("_", " ")} · {formatNumber(a.songCount)} songs
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[0.8125rem] font-semibold tabular-nums text-ink">
                          {formatINR(a.lifetimeArtistPaise)}
                        </p>
                        <p className="text-[0.6875rem] text-ink-subtle">
                          {formatNumber(a.lifetimeStreams)} streams
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Countries + payouts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <div className="border-b border-line px-5 py-3">
                <p className="font-display text-base font-semibold text-ink">Top countries</p>
              </div>
              {!countries.length ? (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">No country breakdown yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line bg-surface-2 text-[0.6875rem] uppercase tracking-wide text-ink-subtle">
                      <tr>
                        <th className="px-5 py-2.5 font-semibold">Country</th>
                        <th className="px-5 py-2.5 text-right font-semibold">Streams</th>
                        <th className="px-5 py-2.5 text-right font-semibold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {countries.map((c) => (
                        <tr key={c.country} className="hover:bg-surface-2/80">
                          <td className="px-5 py-2.5 font-medium text-ink">{c.country}</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {formatNumber(c.streams)}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums text-ink-muted">
                            {formatINR(c.revenuePaise)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <div>
                  <p className="font-display text-base font-semibold text-ink">Payout pipeline</p>
                  <p className="text-xs text-ink-muted">Withdrawal requests by status</p>
                </div>
                <Link href="/payouts" className="text-[0.8125rem] font-medium text-brand hover:underline">
                  Open payouts
                </Link>
              </div>
              {!payouts.length ? (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">No payout activity yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {payouts.map((p) => (
                    <div key={p.status} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="capitalize text-[0.875rem] font-medium text-ink">{p.status}</p>
                        <p className="text-[0.75rem] text-ink-subtle">{formatNumber(p.count)} requests</p>
                      </div>
                      <p className="font-mono text-[0.875rem] font-semibold tabular-nums text-ink">
                        {formatINR(p.amountPaise)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {data?.generatedAt ? (
            <p className="text-center text-[0.6875rem] text-ink-subtle">
              Generated {new Date(data.generatedAt).toLocaleString("en-IN")}
            </p>
          ) : null}
        </div>
      )}
    </AuthGate>
  );
}
