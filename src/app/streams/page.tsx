"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Radio, Upload, X } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, FormMessage } from "@/components/ui/form";
import { api, getToken } from "@/lib/api";
import { formatINR, formatNumber } from "@/lib/format";

type StreamReport = {
  id: string;
  releaseId: string;
  userId: string;
  period: string;
  store: string;
  streams: number;
  revenuePaise: number;
  status: "pending" | "approved" | "rejected";
  source: string;
  note: string | null;
  releaseTitle?: string;
  primaryArtist?: string;
  artistName?: string;
  createdAt: string;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);

const STORES = [
  "Spotify",
  "Apple Music",
  "YouTube Music",
  "Amazon Music",
  "JioSaavn",
  "Instagram & Facebook",
  "TikTok",
  "Deezer",
  "Tidal",
  "Other",
];

function statusTone(s: string) {
  if (s === "approved") return "success" as const;
  if (s === "rejected") return "danger" as const;
  return "warning" as const;
}

export default function StreamReportsPage() {
  const [items, setItems] = useState<StreamReport[]>([]);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [manual, setManual] = useState({
    releaseId: "",
    store: "Spotify",
    streams: "",
    revenueInr: "",
  });

  async function load(next = status) {
    const q = next ? `?status=${encodeURIComponent(next)}&limit=100` : "?limit=100";
    const res = await api<{ items: StreamReport[]; total: number }>(`/admin/stream-reports${q}`);
    if (!res.ok) setError(res.error);
    else {
      setError(null);
      setItems(res.data.items ?? []);
    }
  }

  useEffect(() => {
    void load("pending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pullDrafts() {
    setBusy(true);
    setInfo(null);
    const res = await api<{ created: number; period: string }>(`/admin/stream-reports/pull`, {
      method: "POST",
      body: { period },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setInfo(
      `Created ${res.data.created} draft row(s) for ${res.data.period}. Enter streams and revenue from your DSP statement, then Approve to publish royalties to artists (processing balance).`,
    );
    void load(status);
  }

  async function createManual() {
    const streams = Number(manual.streams);
    if (!manual.releaseId.trim() || !Number.isFinite(streams) || streams < 0) {
      setError("Release ID and a non-negative stream count are required.");
      return;
    }
    const revenueInr = Number(manual.revenueInr);
    const revenuePaise =
      manual.revenueInr.trim() === "" || !Number.isFinite(revenueInr)
        ? 0
        : Math.round(revenueInr * 100);
    setBusy(true);
    const res = await api(`/admin/stream-reports`, {
      method: "POST",
      body: {
        releaseId: manual.releaseId.trim(),
        period,
        store: manual.store,
        streams,
        revenuePaise,
      },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setManual({ releaseId: "", store: "Spotify", streams: "", revenueInr: "" });
    setInfo("Stream report added as pending.");
    void load(status);
  }

  async function updateCounts(row: StreamReport) {
    const streamsRaw = window.prompt(`Streams for ${row.store} — ${row.releaseTitle}`, String(row.streams));
    if (streamsRaw === null) return;
    const streams = Number(streamsRaw);
    if (!Number.isFinite(streams) || streams < 0) {
      setError("Invalid stream count.");
      return;
    }
    const revenueRaw = window.prompt(
      "Revenue in ₹ (gross from DSP statement, optional)",
      row.revenuePaise ? String(row.revenuePaise / 100) : "0",
    );
    if (revenueRaw === null) return;
    const revenueInr = Number(revenueRaw);
    const revenuePaise = Number.isFinite(revenueInr) ? Math.round(revenueInr * 100) : 0;
    const res = await api(`/admin/stream-reports/${row.id}`, {
      method: "PATCH",
      body: { streams, revenuePaise },
    });
    if (!res.ok) setError(res.error);
    else void load(status);
  }

  async function approve(id: string) {
    const res = await api<{ note?: string; period?: string }>(`/admin/stream-reports/${id}/approve`, {
      method: "POST",
    });
    if (!res.ok) setError(res.error);
    else {
      setInfo(
        res.data.note ??
          "Approved — artist royalty statement updated (processing). Release to available on Monthly balances when ready.",
      );
      void load(status);
    }
  }

  async function syncPeriod() {
    if (!period.match(/^\d{4}-\d{2}$/)) {
      setError("Period must be YYYY-MM.");
      return;
    }
    setBusy(true);
    setInfo(null);
    const res = await api<{ summary?: { lines: number; artistSharePaise: number } }>(
      `/admin/stream-reports/sync-period`,
      { method: "POST", body: { period } },
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const s = res.data.summary;
    setInfo(
      s
        ? `Synced ${period}: ${s.lines} song line(s), ${formatINR(s.artistSharePaise)} artist share across all statements.`
        : `Synced royalty statements for ${period}.`,
    );
  }

  async function reject(id: string) {
    const note = window.prompt("Rejection note (optional)") ?? undefined;
    const res = await api(`/admin/stream-reports/${id}/reject`, {
      method: "POST",
      body: { note },
    });
    if (!res.ok) setError(res.error);
    else void load(status);
  }

  async function importCSV(file: File) {
    setBusy(true);
    setError(null);
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/admin/stream-reports/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
        credentials: "omit",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error ?? `Import failed (${res.status})`);
      } else {
        setInfo(`Imported ${payload?.created ?? 0} pending report(s) from CSV.`);
        void load(status);
      }
    } catch {
      setError("Could not upload CSV.");
    }
    setBusy(false);
  }

  return (
    <AuthGate>
      <PageHeader
        title="DSP streams & revenue"
        description="Upload per-store streams and gross revenue from distributor reports. Artists only see royalties after you approve rows here — statements start as processing; release to available on Monthly balances when ready for payout."
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {info ? <FormMessage tone="success">{info}</FormMessage> : null}

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-4 lg:col-span-1">
          <h2 className="text-sm font-semibold text-ink">Pull period drafts</h2>
          <p className="text-xs text-ink-muted">
            Creates empty pending rows for live releases × primary DSPs so you can fill real numbers.
          </p>
          <Field label="Period (YYYY-MM)" htmlFor="period">
            <Input
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="2026-07"
            />
          </Field>
          <Button type="button" size="sm" disabled={busy} onClick={() => void pullDrafts()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
            Create DSP drafts
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void syncPeriod()}>
            Sync royalty statements
          </Button>
          <p className="text-[0.6875rem] leading-relaxed text-ink-subtle">
            After approving uploads, use sync if totals look stale. Artists see processing balances immediately on approve.
          </p>
        </Card>

        <Card className="space-y-3 p-4 lg:col-span-1">
          <h2 className="text-sm font-semibold text-ink">Add one report</h2>
          <Field label="Release ID" htmlFor="rid">
            <Input
              id="rid"
              value={manual.releaseId}
              onChange={(e) => setManual((m) => ({ ...m, releaseId: e.target.value }))}
              placeholder="uuid"
            />
          </Field>
          <Field label="Store" htmlFor="store">
            <Select
              id="store"
              value={manual.store}
              onChange={(e) => setManual((m) => ({ ...m, store: e.target.value }))}
            >
              {STORES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Streams" htmlFor="streams">
              <Input
                id="streams"
                inputMode="numeric"
                value={manual.streams}
                onChange={(e) => setManual((m) => ({ ...m, streams: e.target.value }))}
              />
            </Field>
            <Field label="Revenue (₹)" htmlFor="rev">
              <Input
                id="rev"
                inputMode="decimal"
                placeholder="e.g. 482.50"
                value={manual.revenueInr}
                onChange={(e) => setManual((m) => ({ ...m, revenueInr: e.target.value }))}
              />
            </Field>
          </div>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void createManual()}>
            Add pending
          </Button>
        </Card>

        <Card className="space-y-3 p-4 lg:col-span-1">
          <h2 className="text-sm font-semibold text-ink">Import CSV</h2>
          <p className="text-xs text-ink-muted">
            Columns: <code className="text-ink">releaseId,period,store,streams,revenuePaise</code> (revenue in paise)
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface-2">
            <Upload className="size-4" />
            Choose CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importCSV(f);
                e.target.value = "";
              }}
            />
          </label>
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onChange={(e) => {
            const next = e.target.value;
            setStatus(next);
            void load(next);
          }}
          className="w-44"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </Select>
        <Button type="button" size="sm" variant="ghost" onClick={() => void load(status)}>
          Refresh
        </Button>
      </div>

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Radio className="size-5" />}
              title="No stream reports"
              description="Pull DSP drafts for a period, import a CSV from your distributor, or add a row manually."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[0.8125rem]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-ink-subtle">
                  <th className="px-4 py-3 font-medium">Release</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Store</th>
                  <th className="px-4 py-3 font-medium text-right">Streams</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{row.releaseTitle ?? row.releaseId}</p>
                      <p className="text-xs text-ink-subtle">
                        {row.primaryArtist ?? row.artistName}
                        {row.source ? ` · ${row.source}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{row.period}</td>
                    <td className="px-4 py-3 text-ink">{row.store}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-ink">
                      {formatNumber(row.streams)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-muted">
                      {row.revenuePaise > 0 ? formatINR(row.revenuePaise) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(row.status)}>
                        <Dot tone={statusTone(row.status)} />
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {row.status === "pending" ? (
                          <>
                            <Button type="button" size="sm" variant="ghost" onClick={() => void updateCounts(row)}>
                              Edit
                            </Button>
                            <Button type="button" size="sm" variant="success" onClick={() => void approve(row.id)}>
                              <Check className="size-3.5" />
                              Approve
                            </Button>
                            <Button type="button" size="sm" variant="danger" onClick={() => void reject(row.id)}>
                              <X className="size-3.5" />
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AuthGate>
  );
}
