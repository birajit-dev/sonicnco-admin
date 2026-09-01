"use client";

import { useEffect, useState } from "react";
import { BadgeIndianRupee, CalendarRange, Search, Wallet } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Select, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatINR, formatNumber, formatDate } from "@/lib/format";

type RoyaltyRow = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  period: string;
  grossPaise: number;
  platformSharePaise: number;
  artistSharePaise: number;
  streams: number;
  status: string;
  publishedAt: string | null;
};

type Breakdown = { store: string; streams: number; grossPaise: number };

export default function RoyaltiesPage() {
  const [items, setItems] = useState<RoyaltyRow[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown[]>([]);

  async function load(next = status) {
    const q = next ? `?status=${encodeURIComponent(next)}` : "";
    const res = await api<{ items: RoyaltyRow[] | null; total: number }>(`/admin/royalties${q}`);
    if (!res.ok) {
      setError(res.error);
      setItems([]);
      return;
    }
    setError(null);
    setItems(res.data.items ?? []);
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDetail(id: string) {
    setSelected(id);
    const res = await api<{ statement: RoyaltyRow; breakdown: Breakdown[] }>(`/admin/royalties/${id}`);
    if (!res.ok) {
      setError(res.error);
      setBreakdown([]);
      return;
    }
    setBreakdown(res.data.breakdown ?? []);
  }

  const tone = (s: string) =>
    s === "paid" || s === "available" ? "success" : s === "processing" ? "warning" : "neutral";

  const selectedRow = items.find((i) => i.id === selected) ?? null;

  return (
    <AuthGate>
      <PageHeader
        title="Royalties"
        description="Monthly statements, artist vs platform share, and per-store breakdowns."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/royalties/balances" size="sm" variant="secondary">
              <Wallet className="size-4" />
              Monthly balances
            </ButtonLink>
            <ButtonLink href="/royalties/monthly" size="sm" variant="outline">
              <CalendarRange className="size-4" />
              Monthly report
            </ButtonLink>
            <ButtonLink href="/royalties/lookup" size="sm" variant="outline">
              <Search className="size-4" />
              Search earnings
            </ButtonLink>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                void load(e.target.value);
              }}
            >
              <option value="">All statuses</option>
              <option value="processing">Processing</option>
              <option value="available">Available</option>
              <option value="paid">Paid</option>
            </Select>
          </div>
        }
      />
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      {items.length === 0 && !error ? (
        <EmptyState
          icon={<BadgeIndianRupee className="size-6" />}
          title="No royalty statements"
          description="Run the demo seed to populate statements."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[0.8125rem]">
                <thead className="border-b border-line bg-surface-2 text-ink-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Artist</th>
                    <th className="px-5 py-3 font-medium">Period</th>
                    <th className="px-5 py-3 font-medium">Streams</th>
                    <th className="px-5 py-3 font-medium">Artist share</th>
                    <th className="px-5 py-3 font-medium">Platform</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer hover:bg-surface-2"
                      onClick={() => void openDetail(row.id)}
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink">{row.userName}</div>
                        <div className="text-xs text-ink-subtle">{row.email}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{row.period}</td>
                      <td className="px-5 py-3">{formatNumber(row.streams)}</td>
                      <td className="px-5 py-3 font-medium">{formatINR(row.artistSharePaise)}</td>
                      <td className="px-5 py-3 text-ink-muted">{formatINR(row.platformSharePaise)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={tone(row.status)}>
                          <Dot tone={tone(row.status)} />
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Store breakdown</CardTitle>
            </CardHeader>
            <CardBody>
              {!selectedRow ? (
                <p className="text-sm text-ink-muted">Select a statement to see per-platform earnings.</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-ink">{selectedRow.userName}</p>
                  <p className="text-xs text-ink-subtle">
                    {selectedRow.period}
                    {selectedRow.publishedAt ? ` · published ${formatDate(selectedRow.publishedAt)}` : ""}
                  </p>
                  <p className="mt-3 text-sm text-ink-muted">
                    Gross {formatINR(selectedRow.grossPaise)} · Artist{" "}
                    {formatINR(selectedRow.artistSharePaise)} · Platform{" "}
                    {formatINR(selectedRow.platformSharePaise)}
                  </p>
                  <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
                    {breakdown.map((b) => (
                      <li key={b.store} className="flex items-center justify-between px-4 py-3 text-sm">
                        <span>{b.store}</span>
                        <span className="text-ink-muted">
                          {formatNumber(b.streams)} · {formatINR(b.grossPaise)}
                        </span>
                      </li>
                    ))}
                    {breakdown.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-ink-muted">No store split for this statement.</li>
                    ) : null}
                  </ul>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </AuthGate>
  );
}
