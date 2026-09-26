"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Plus, Search } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { CreateUserModal } from "@/components/create-user-modal";
import { api } from "@/lib/api";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type CompanyRow = {
  id: string;
  name: string;
  artistName: string;
  companyName: string | null;
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

export default function CompaniesPage() {
  const [items, setItems] = useState<CompanyRow[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async (query = q) => {
    const params = new URLSearchParams({
      accountType: "production_company",
      withStats: "1",
      limit: "100",
    });
    if (query.trim()) params.set("q", query.trim());
    const res = await api<{ items: CompanyRow[]; total: number; counts: Counts }>(
      `/admin/users?${params}`,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setItems(res.data.items ?? []);
    setTotal(res.data.total ?? 0);
    setCounts(res.data.counts ?? {});
  }, [q]);

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthGate>
      <PageHeader
        title="Production companies"
        description="Label accounts with catalogue size, earnings, and withdrawable balance."
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add user
          </Button>
        }
      />
      <CreateUserModal
        open={adding}
        defaultRole="production_company"
        onClose={() => setAdding(false)}
        onCreated={() => void load()}
      />
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <div className="mb-5 grid gap-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card sm:grid-cols-3">
        {[
          { label: "Companies", value: formatNumber(counts.all ?? total) },
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

      <form
        className="mb-4 flex w-full gap-2 sm:max-w-sm"
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
            placeholder="Search company or email"
            className="h-9 pl-9"
          />
        </div>
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>

      {!items.length && !error ? (
        <EmptyState
          icon={<Building2 className="size-6" />}
          title="No production companies"
          description="Production company accounts will appear here once registered."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                  <th className="px-4 py-3">Company</th>
                  <th className="hidden px-4 py-3 md:table-cell">Catalogue</th>
                  <th className="px-4 py-3 text-right">Lifetime</th>
                  <th className="px-4 py-3 text-right">Withdrawable</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((u) => {
                  const label = u.companyName || u.artistName || u.name;
                  return (
                    <tr key={u.id} className="group transition-colors hover:bg-surface-2/80">
                      <td className="px-4 py-3">
                        <Link href={`/users/${u.id}`} className="flex items-center gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-3 text-[0.75rem] font-semibold text-ink-muted ring-1 ring-line">
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
                        <Link
                          href={`/users/${u.id}`}
                          className="inline-grid size-8 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink"
                          aria-label="Open profile"
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-3 text-xs text-ink-subtle">
            {formatNumber(items.length)} of {formatNumber(total)} companies · open for full earnings profile
          </div>
        </div>
      )}
    </AuthGate>
  );
}
