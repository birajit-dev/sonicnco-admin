"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  RadioTower,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardBody, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";

type Overview = {
  notReady: number;
  ready: number;
  queued: number;
  inTransit: number;
  partial: number;
  live: number;
  attention: number;
  takedown: number;
  total: number;
};

type QueueRow = {
  id: string;
  title: string;
  primaryArtist: string;
  artworkUrl: string | null;
  genre: string;
  language: string;
  status: string;
  distributionStage: string;
  distributionTier: string;
  userName: string;
  email: string;
  storeTotal: number;
  storePending: number;
  storeDelivered: number;
  storeLive: number;
  storeFailed: number;
  hasAudio: boolean;
  hasIsrc: boolean;
  hasArtwork: boolean;
};

const STAGES: { id: string; label: string; tone: "danger" | "success" | "warning" | "info" | "brand" | "neutral" }[] = [
  { id: "attention", label: "Attention", tone: "danger" },
  { id: "ready", label: "Ready to send", tone: "brand" },
  { id: "queued", label: "Queued", tone: "warning" },
  { id: "in_transit", label: "In transit", tone: "info" },
  { id: "partial", label: "Partial live", tone: "info" },
  { id: "live", label: "Fully live", tone: "success" },
  { id: "not_ready", label: "Not ready", tone: "neutral" },
  { id: "takedown", label: "Takedown", tone: "neutral" },
];

function stageCount(o: Overview | null, id: string) {
  if (!o) return 0;
  const map: Record<string, number> = {
    attention: o.attention,
    ready: o.ready,
    queued: o.queued,
    in_transit: o.inTransit,
    partial: o.partial,
    live: o.live,
    not_ready: o.notReady,
    takedown: o.takedown,
  };
  return map[id] ?? 0;
}

export default function DistributionOpsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stage, setStage] = useState("ready");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<QueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const limit = 50;

  const loadOverview = useCallback(async () => {
    const res = await api<{ overview: Overview }>("/admin/distribution/overview");
    if (res.ok) setOverview(res.data.overview);
  }, []);

  const loadQueue = useCallback(
    async (nextStage = stage, nextQ = q, nextOffset = 0) => {
      setBusy(true);
      const params = new URLSearchParams({
        stage: nextStage,
        limit: String(limit),
        offset: String(nextOffset),
      });
      if (nextQ.trim()) params.set("q", nextQ.trim());
      const res = await api<{ items: QueueRow[] | null; total: number }>(
        `/admin/distribution/queue?${params}`,
      );
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        setItems([]);
        setTotal(0);
        return;
      }
      setError(null);
      setItems(res.data.items ?? []);
      setTotal(res.data.total);
      setOffset(nextOffset);
    },
    [stage, q],
  );

  useEffect(() => {
    void loadOverview();
    void loadQueue("ready", "", 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function backfill() {
    setBusy(true);
    const res = await api<{ updated: number }>("/admin/distribution/backfill", { method: "POST" });
    setBusy(false);
    if (!res.ok) setError(res.error);
    else {
      await loadOverview();
      await loadQueue(stage, q, 0);
    }
  }

  return (
    <AuthGate>
      <PageHeader
        title="Distribution ops"
        description="Song-first queues for DSP delivery — never load millions of store rows. Open one song, verify checklist, then send."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => void backfill()} disabled={busy}>
              <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
              Recompute stages
            </Button>
          </div>
        }
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Needs attention" value={formatNumber(overview?.attention ?? 0)} accent="brand" />
        <StatCard label="Ready to send" value={formatNumber(overview?.ready ?? 0)} accent="success" />
        <StatCard label="In flight" value={formatNumber((overview?.queued ?? 0) + (overview?.inTransit ?? 0) + (overview?.partial ?? 0))} accent="info" />
        <StatCard label="Fully live" value={formatNumber(overview?.live ?? 0)} accent="warning" />
      </div>

      <Card className="mb-5">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStage(s.id);
                  void loadQueue(s.id, q, 0);
                }}
                className={`rounded-full border px-3 py-1.5 text-[0.8125rem] transition-colors ${
                  stage === s.id
                    ? "border-brand bg-brand-soft font-medium text-brand"
                    : "border-line text-ink-muted hover:bg-surface-2"
                }`}
              >
                {s.label}
                <span className="ml-1.5 text-ink-subtle">{formatNumber(stageCount(overview, s.id))}</span>
              </button>
            ))}
          </div>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void loadQueue(stage, q, 0);
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, artist, email, or release ID"
              className="min-w-64 flex-1"
            />
            <Button type="submit" size="sm" disabled={busy}>
              <Search className="size-4" />
              Search
            </Button>
          </form>
          <p className="text-xs text-ink-subtle">
            Showing {formatNumber(items.length)} of {formatNumber(total)} songs in this queue (page size {limit}).
            Store-level edits happen only on the song cockpit — mistake surface stays tiny.
          </p>
        </CardBody>
      </Card>

      {items.length === 0 && !error ? (
        <EmptyState
          icon={<RadioTower className="size-6" />}
          title="Queue empty"
          description="Approve songs with complete PDL metadata, or switch stage. Use Recompute stages after seeding."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[0.8125rem]">
              <thead className="border-b border-line bg-surface-2 text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Song</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Readiness</th>
                  <th className="px-5 py-3 font-medium">Stores</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
                          {row.artworkUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.artworkUrl} alt="" className="size-full object-cover" />
                          ) : null}
                        </div>
                        <div>
                          <Link href={`/distribution/${row.id}`} className="font-medium text-ink hover:underline">
                            {row.title}
                          </Link>
                          <p className="text-xs text-ink-subtle">
                            {row.primaryArtist} · {row.genre} · {row.language}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-ink">{row.userName}</div>
                      <div className="text-xs text-ink-subtle">{row.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={row.hasArtwork ? "success" : "danger"}>Art</Badge>
                        <Badge tone={row.hasAudio ? "success" : "danger"}>WAV</Badge>
                        <Badge tone={row.hasIsrc ? "success" : "danger"}>ISRC</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {row.storeTotal === 0 ? (
                        "Not sent"
                      ) : (
                        <>
                          {row.storeLive}L / {row.storeDelivered}D / {row.storePending}P
                          {row.storeFailed ? (
                            <span className="text-danger"> / {row.storeFailed}F</span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ButtonLink href={`/distribution/${row.id}`} size="sm" variant="secondary">
                        {row.distributionStage === "ready" ? (
                          <>
                            <Send className="size-3.5" /> Send
                          </>
                        ) : row.storeFailed > 0 ? (
                          <>
                            <AlertTriangle className="size-3.5" /> Fix
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5" /> Open
                          </>
                        )}
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={offset === 0 || busy}
              onClick={() => void loadQueue(stage, q, Math.max(0, offset - limit))}
            >
              Previous
            </Button>
            <span className="text-xs text-ink-subtle">
              {offset + 1}–{Math.min(offset + limit, total)} of {formatNumber(total)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={offset + limit >= total || busy}
              onClick={() => void loadQueue(stage, q, offset + limit)}
            >
              Next
            </Button>
          </div>
        </Card>
      )}
    </AuthGate>
  );
}
