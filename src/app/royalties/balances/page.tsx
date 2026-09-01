"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeIndianRupee, Clock3, Wallet } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge, Dot } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Statement = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  period: string;
  grossPaise: number;
  platformSharePaise: number;
  artistSharePaise: number;
  streams: number;
  status: "processing" | "available" | string;
  publishedAt: string | null;
};

type Summary = {
  period: string;
  processingCount: number;
  processingPaise: number;
  availableCount: number;
  availablePaise: number;
  totalCount: number;
  totalArtistPaise: number;
  totalStreams: number;
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period: string) {
  const [y, m] = period.split("-");
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(
    new Date(Number(y), Number(m) - 1, 1),
  );
}

function statusTone(s: string) {
  if (s === "available") return "success" as const;
  if (s === "processing") return "warning" as const;
  return "neutral" as const;
}

export default function RoyaltyBalancesPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [periods, setPeriods] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Statement[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "processing" | "available">("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load(p = period) {
    setError(null);
    const [sumRes, listRes] = await Promise.all([
      api<{ summary: Summary; periods: string[]; period: string }>(
        `/admin/royalties/balances?period=${encodeURIComponent(p)}`,
      ),
      api<{ items: Statement[] | null; total: number }>(
        `/admin/royalties?period=${encodeURIComponent(p)}&limit=500`,
      ),
    ]);
    if (!sumRes.ok) {
      setError(sumRes.error);
      return;
    }
    if (!listRes.ok) {
      setError(listRes.error);
      return;
    }
    setSummary(sumRes.data.summary);
    setPeriods(sumRes.data.periods?.length ? sumRes.data.periods : [p]);
    setPeriod(sumRes.data.period || p);
    // Balance release only manages processing ↔ available (paid is payouts-only)
    setItems((listRes.data.items ?? []).filter((i) => i.status === "processing" || i.status === "available"));
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  async function setStatus(id: string, status: "processing" | "available") {
    setBusyId(id);
    setMessage(null);
    const res = await api(`/admin/royalties/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMessage(`Updated statement to ${status}.`);
    await load(period);
  }

  async function bulk(fromStatus: "processing" | "available", toStatus: "processing" | "available") {
    const label =
      fromStatus === "processing" && toStatus === "available"
        ? `Release all processing balances for ${periodLabel(period)} to available?`
        : `Move all available statements for ${periodLabel(period)} back to processing?`;
    if (!window.confirm(label)) return;
    setBulkBusy(true);
    setMessage(null);
    const res = await api<{ updated: number }>(`/admin/royalties/balances/bulk`, {
      method: "POST",
      body: { period, fromStatus, toStatus },
    });
    setBulkBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMessage(`Updated ${res.data.updated} statement(s).`);
    await load(period);
  }

  const periodList = periods.length ? periods : [period];

  return (
    <AuthGate>
      <PageHeader
        title="Monthly balances"
        description="Release each month’s royalty statements from processing → available so artists can withdraw. Payout settlement is handled on Payouts when a user requests withdrawal."
        breadcrumbs={[
          { label: "Royalties", href: "/royalties" },
          { label: "Monthly balances" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/royalties" size="sm" variant="ghost">
              Statements
            </ButtonLink>
            <ButtonLink href="/royalties/monthly" size="sm" variant="outline">
              Monthly report
            </ButtonLink>
            <ButtonLink href="/payouts" size="sm" variant="outline">
              Payouts
            </ButtonLink>
          </div>
        }
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {message ? <FormMessage tone="success">{message}</FormMessage> : null}

      <div className="mb-5 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/70 px-4 py-2.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Statement month
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

      {summary ? (
        <div className="mb-5 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="grid gap-0 sm:grid-cols-3">
            {[
              {
                label: "Processing",
                value: formatINR(summary.processingPaise),
                sub: `${formatNumber(summary.processingCount)} statements · not withdrawable`,
                icon: <Clock3 className="size-4 text-warning" />,
              },
              {
                label: "Available",
                value: formatINR(summary.availablePaise),
                sub: `${formatNumber(summary.availableCount)} statements · withdrawable`,
                icon: <Wallet className="size-4 text-success" />,
              },
              {
                label: "Month artist share",
                value: formatINR(summary.processingPaise + summary.availablePaise),
                sub: `${formatNumber(summary.totalStreams)} streams · release when ready`,
                icon: <BadgeIndianRupee className="size-4 text-ink-muted" />,
              },
            ].map((cell, i) => (
              <div
                key={cell.label}
                className={cn("px-5 py-4", i > 0 && "border-t border-line sm:border-t-0 sm:border-l")}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                    {cell.label}
                  </p>
                  {cell.icon}
                </div>
                <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-ink">
                  {cell.value}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{cell.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-line bg-surface-2/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">
              Hold months in <strong className="text-ink">processing</strong>, then release to{" "}
              <strong className="text-ink">available</strong>. When an artist requests withdrawal, manage it under{" "}
              <Link href="/payouts" className="font-medium text-brand hover:underline">
                Payouts
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="success"
                disabled={bulkBusy || !summary.processingCount}
                onClick={() => void bulk("processing", "available")}
              >
                Release all processing → available
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkBusy || !summary.availableCount}
                onClick={() => void bulk("available", "processing")}
              >
                Revert available → processing
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-1.5 rounded-lg border border-line bg-surface p-1">
        {(
          [
            { id: "all", label: "All" },
            { id: "processing", label: "Processing" },
            { id: "available", label: "Available" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors",
              statusFilter === tab.id
                ? "bg-surface-3 font-medium text-ink"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {tab.label}
            {tab.id === "processing" && summary ? (
              <span className="ml-1.5 text-ink-subtle">{summary.processingCount}</span>
            ) : null}
            {tab.id === "available" && summary ? (
              <span className="ml-1.5 text-ink-subtle">{summary.availableCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      {!visible.length && !error ? (
        <EmptyState
          icon={<Wallet className="size-6" />}
          title="No statements for this month"
          description="Pick another period, or rebuild the monthly report first."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3 text-right">Streams</th>
                  <th className="px-4 py-3 text-right">Artist share</th>
                  <th className="px-4 py-3 text-right">Platform</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Update balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-2/80">
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${row.userId}`}
                        className="block text-[0.875rem] font-semibold text-ink hover:text-brand"
                      >
                        {row.userName}
                      </Link>
                      <p className="text-[0.75rem] text-ink-muted">{row.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums">
                      {formatNumber(row.streams)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[0.8125rem] font-semibold tabular-nums text-ink">
                      {formatINR(row.artistSharePaise)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink-muted">
                      {formatINR(row.platformSharePaise)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(row.status)}>
                        <Dot tone={statusTone(row.status)} />
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {row.status === "processing" ? (
                          <Button
                            size="sm"
                            variant="success"
                            disabled={busyId === row.id}
                            onClick={() => void setStatus(row.id, "available")}
                          >
                            Mark available
                          </Button>
                        ) : null}
                        {row.status === "available" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === row.id}
                            onClick={() => void setStatus(row.id, "processing")}
                          >
                            Back to processing
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-3 text-xs text-ink-subtle">
            {formatNumber(visible.length)} statement{visible.length === 1 ? "" : "s"} · withdrawal requests appear
            under Payouts
          </div>
        </div>
      )}
    </AuthGate>
  );
}
