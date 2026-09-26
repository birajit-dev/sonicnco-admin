"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Mic2, Plus, Search } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { CreateUserModal } from "@/components/create-user-modal";
import { api } from "@/lib/api";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type ArtistRow = {
  id: string;
  name: string;
  artistName: string;
  email: string;
  plan: string | null;
  kycStatus: string;
  status: string;
  createdAt: string;
  releaseCount: number;
  liveCount: number;
  lifetimeArtistPaise: number;
  lifetimeStreams: number;
  availableBalancePaise: number;
  pendingPayoutPaise: number;
  payoutAvailablePaise: number;
};

type Counts = Record<string, number>;

const STATUS_TABS = [
  { id: "", label: "All" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
] as const;

function statusTone(s: string) {
  if (s === "active") return "success" as const;
  if (s === "suspended") return "danger" as const;
  return "neutral" as const;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export default function ArtistsPage() {
  const [items, setItems] = useState<ArtistRow[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async (query = q, st = status) => {
    setBusy(true);
    const params = new URLSearchParams({
      accountType: "artist",
      withStats: "1",
      limit: "100",
    });
    if (query.trim()) params.set("q", query.trim());
    if (st) params.set("status", st);
    const res = await api<{ items: ArtistRow[]; total: number; counts: Counts }>(
      `/admin/users?${params}`,
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setItems(res.data.items ?? []);
    setTotal(res.data.total ?? 0);
    setCounts(res.data.counts ?? {});
  }, [q, status]);

  useEffect(() => {
    void load("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStatus(user: ArtistRow, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = user.status === "active" ? "suspended" : "active";
    const res = await api(`/admin/users/${user.id}/status`, {
      method: "PATCH",
      body: { status: next },
    });
    if (!res.ok) setError(res.error);
    else void load();
  }

  return (
    <AuthGate>
      <PageHeader
        title="Artists"
        description="Catalogue of artist accounts with catalogue size, earnings, and withdrawable balance."
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add user
          </Button>
        }
      />
      <CreateUserModal
        open={adding}
        defaultRole="artist"
        onClose={() => setAdding(false)}
        onCreated={() => void load()}
      />

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <div className="mb-5 grid gap-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card sm:grid-cols-3">
        {[
          { label: "Artists", value: formatNumber(counts.all ?? total) },
          { label: "Active", value: formatNumber(counts.active ?? 0) },
          { label: "Suspended", value: formatNumber(counts.suspended ?? 0) },
        ].map((cell, i) => (
          <div
            key={cell.label}
            className={cn("px-5 py-4", i > 0 && "border-t border-line sm:border-t-0 sm:border-l")}
          >
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              {cell.label}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
              {cell.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-line bg-surface p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id || "all"}
              type="button"
              onClick={() => {
                setStatus(tab.id);
                void load(q, tab.id);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors",
                status === tab.id
                  ? "bg-surface-3 font-medium text-ink"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
              {tab.id === "" && counts.all != null ? (
                <span className="ml-1.5 text-ink-subtle">{counts.all}</span>
              ) : null}
              {tab.id && counts[tab.id] != null ? (
                <span className="ml-1.5 text-ink-subtle">{counts[tab.id]}</span>
              ) : null}
            </button>
          ))}
        </div>
        <form
          className="flex w-full gap-2 sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or email"
              className="h-9 pl-9"
            />
          </div>
          <Button type="submit" size="sm" disabled={busy}>
            Search
          </Button>
        </form>
      </div>

      {!items.length && !error ? (
        <EmptyState
          icon={<Mic2 className="size-6" />}
          title="No artists found"
          description="Artists who sign up will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                  <th className="px-4 py-3">Artist</th>
                  <th className="hidden px-4 py-3 md:table-cell">Catalogue</th>
                  <th className="px-4 py-3 text-right">Lifetime</th>
                  <th className="hidden px-4 py-3 text-right lg:table-cell">Streams</th>
                  <th className="px-4 py-3 text-right">Withdrawable</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((u) => {
                  const label = u.artistName || u.name;
                  return (
                    <tr key={u.id} className="group transition-colors hover:bg-surface-2/80">
                      <td className="px-4 py-3">
                        <Link href={`/users/${u.id}`} className="flex items-center gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.75rem] font-semibold text-brand ring-1 ring-brand/15">
                            {initials(label)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[0.875rem] font-semibold text-ink group-hover:text-brand">
                              {label}
                            </p>
                            <p className="truncate text-[0.75rem] text-ink-muted">{u.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <p className="text-[0.8125rem] tabular-nums text-ink">
                          {formatNumber(u.releaseCount)} songs
                        </p>
                        <p className="text-[0.6875rem] text-ink-subtle">
                          {formatNumber(u.liveCount)} live
                          {u.plan ? ` · ${u.plan}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] font-semibold tabular-nums text-ink">
                        {formatINR(u.lifetimeArtistPaise)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink-muted lg:table-cell">
                        {formatNumber(u.lifetimeStreams)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink">
                        {formatINR(u.payoutAvailablePaise)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(u.status)}>
                          <Dot tone={statusTone(u.status)} />
                          {u.status}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-[0.75rem] text-ink-subtle xl:table-cell">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant={u.status === "active" ? "ghost" : "success"}
                            size="sm"
                            onClick={(e) => void toggleStatus(u, e)}
                          >
                            {u.status === "active" ? "Suspend" : "Activate"}
                          </Button>
                          <Link
                            href={`/users/${u.id}`}
                            className="inline-grid size-8 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink"
                            aria-label="Open profile"
                          >
                            <ChevronRight className="size-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-3 text-xs text-ink-subtle">
            {formatNumber(items.length)} of {formatNumber(total)} artists · open a row for full earnings & platform split
          </div>
        </div>
      )}
    </AuthGate>
  );
}
