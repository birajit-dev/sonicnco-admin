"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Disc3,
  Flame,
  History,
  Mail,
  MoreHorizontal,
  Music2,
  RadioTower,
  Search,
  ShieldAlert,
  Video,
  X,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PdlActionModal } from "@/components/pdl-action-modal";
import { PdlHistoryModal } from "@/components/pdl-history-modal";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import type { PDLActionType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Track = { id: string; title: string; isrc: string | null };
type SongRow = {
  id: string;
  title: string;
  primaryArtist: string;
  status: string;
  genre: string;
  language?: string;
  upc?: string | null;
  artworkUrl?: string | null;
  distributionTier?: string;
  distributionStage?: string;
  createdAt: string;
  updatedAt: string;
  tracks?: Track[];
};

const PIPELINE = [
  { value: "in_review", label: "In review" },
  { value: "revision_requested", label: "Revision" },
  { value: "approved", label: "Approved" },
  { value: "delivered", label: "Delivered" },
  { value: "live", label: "Live" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
] as const;

function statusTone(s: string) {
  if (s === "live" || s === "approved" || s === "published") return "success" as const;
  if (s === "rejected") return "danger" as const;
  if (s === "in_review" || s === "revision_requested") return "warning" as const;
  if (s === "delivered") return "info" as const;
  return "neutral" as const;
}

function statusLabel(s: string) {
  return s.replaceAll("_", " ");
}

function RowMenu({
  open,
  anchorEl,
  onClose,
  onApprove,
  onReject,
  onRevision,
  onISRC,
  onUPC,
  onLive,
  onPdlAction,
  detailHref,
  distHref,
}: {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRevision: () => void;
  onISRC: () => void;
  onUPC: () => void;
  onLive: () => void;
  onPdlAction: (action: PDLActionType) => void;
  detailHref: string;
  distHref: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !anchorEl) {
      setPosition(null);
      return;
    }

    function updatePosition() {
      if (!anchorEl) return;
      const rect = anchorEl.getBoundingClientRect();
      const menuWidth = 224; // w-56
      const menuHeight = 420;
      const gap = 4;
      let top = rect.bottom + gap;
      let left = rect.right - menuWidth;

      if (left < 8) left = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      if (top + menuHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - menuHeight - gap);
      }

      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorEl]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorEl]);

  if (!open || !position || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 w-56 max-h-[min(28rem,calc(100vh-1rem))] overflow-y-auto rounded-lg border border-line bg-canvas py-1 shadow-raised"
    >
      <Link
        href={detailHref}
        className="block px-3 py-2 text-[0.8125rem] text-ink hover:bg-surface-2"
        onClick={onClose}
      >
        Open details
      </Link>
      <Link
        href={distHref}
        className="block px-3 py-2 text-[0.8125rem] text-ink hover:bg-surface-2"
        onClick={onClose}
      >
        Distribution
      </Link>
      <div className="my-1 border-t border-line" />
      <div className="px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-subtle">
        PDL Automail Actions
      </div>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.8125rem] text-danger hover:bg-danger-soft"
        onClick={() => {
          onPdlAction("urgent_dsp_upload");
          onClose();
        }}
      >
        <Flame className="size-3.5" />
        1. Urgent DSP Upload Email
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.8125rem] text-amber-600 hover:bg-amber-50"
        onClick={() => {
          onPdlAction("youtube_claim_release");
          onClose();
        }}
      >
        <ShieldAlert className="size-3.5" />
        2. YouTube Claim Removal
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.8125rem] text-sky-600 hover:bg-sky-50"
        onClick={() => {
          onPdlAction("youtube_topic");
          onClose();
        }}
      >
        <Video className="size-3.5" />
        3. Proceed to YouTube Topic
      </button>
      <div className="my-1 border-t border-line" />
      <button type="button" className="block w-full px-3 py-2 text-left text-[0.8125rem] text-success hover:bg-success-soft" onClick={() => { onApprove(); onClose(); }}>
        Approve
      </button>
      <button type="button" className="block w-full px-3 py-2 text-left text-[0.8125rem] text-ink hover:bg-surface-2" onClick={() => { onRevision(); onClose(); }}>
        Request revision
      </button>
      <button type="button" className="block w-full px-3 py-2 text-left text-[0.8125rem] text-ink hover:bg-surface-2" onClick={() => { onISRC(); onClose(); }}>
        Assign ISRC
      </button>
      <button type="button" className="block w-full px-3 py-2 text-left text-[0.8125rem] text-ink hover:bg-surface-2" onClick={() => { onUPC(); onClose(); }}>
        Assign UPC
      </button>
      <button type="button" className="block w-full px-3 py-2 text-left text-[0.8125rem] text-ink hover:bg-surface-2" onClick={() => { onLive(); onClose(); }}>
        Mark live
      </button>
      <div className="my-1 border-t border-line" />
      <button type="button" className="block w-full px-3 py-2 text-left text-[0.8125rem] text-danger hover:bg-danger-soft" onClick={() => { onReject(); onClose(); }}>
        Reject
      </button>
    </div>,
    document.body,
  );
}

export default function SongsPage() {
  const [items, setItems] = useState<SongRow[]>([]);
  const [status, setStatus] = useState("in_review");
  const [q, setQ] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pdlModalOpen, setPdlModalOpen] = useState(false);
  const [pdlAction, setPdlAction] = useState<PDLActionType>("urgent_dsp_upload");
  const [pdlSongs, setPdlSongs] = useState<{ id: string; title: string; primaryArtist: string; isrc?: string | null; upc?: string | null }[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const limit = 40;

  const load = useCallback(
    async (nextStatus = status, nextQ = q, nextOffset = 0) => {
      setBusy(true);
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(nextOffset),
      });
      if (nextStatus) params.set("status", nextStatus);
      if (nextQ.trim()) params.set("q", nextQ.trim());
      const res = await api<{
        items: SongRow[] | null;
        total: number;
        counts?: Record<string, number>;
      }>(`/admin/releases?${params}`);
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
      if (res.data.counts) setCounts(res.data.counts);
      setOffset(nextOffset);
      setSelected(new Set());
      setMenuId(null);
      setMenuAnchor(null);
    },
    [status, q],
  );

  useEffect(() => {
    void load("in_review", "", 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id: string, next: string) {
    const notes =
      next === "rejected" ? window.prompt("Rejection reason (optional)") ?? undefined : undefined;
    const res = await api(`/admin/releases/${id}/status`, {
      method: "PATCH",
      body: { status: next, notes },
    });
    if (!res.ok) setError(res.error);
    else void load();
  }

  async function requestRevision(id: string) {
    const notes = window.prompt("What should the artist fix?");
    if (!notes) return;
    const res = await api(`/admin/releases/${id}/revision`, {
      method: "POST",
      body: { notes },
    });
    if (!res.ok) setError(res.error);
    else void load();
  }

  async function assignISRC(release: SongRow) {
    const track = release.tracks?.[0];
    if (!track) {
      setError("This release has no tracks to assign an ISRC to.");
      return;
    }
    const isrc = window.prompt(`ISRC for “${track.title}”:`);
    if (!isrc) return;
    const res = await api(`/admin/tracks/isrc`, {
      method: "POST",
      body: { trackId: track.id, isrc },
    });
    if (!res.ok) setError(res.error);
    else void load();
  }

  async function assignUPC(release: SongRow) {
    const entered = window.prompt(
      `UPC for “${release.title}”\n\nLeave empty to auto-allocate the next Sonic & Co UPC (after internal approval).`,
      release.upc ?? "",
    );
    if (entered === null) return;
    const res = await api<{ ok: true; upc: string }>(`/admin/releases/upc`, {
      method: "POST",
      body: { releaseId: release.id, upc: entered.trim() },
    });
    if (!res.ok) setError(res.error);
    else {
      if (res.data.upc) {
        window.alert(`UPC set to ${res.data.upc}`);
      }
      void load();
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  async function bulkApprove() {
    if (!selected.size) return;
    const ok = window.confirm(`Approve ${selected.size} selected song(s)?`);
    if (!ok) return;
    setBusy(true);
    for (const id of selected) {
      await api(`/admin/releases/${id}/status`, { method: "PATCH", body: { status: "approved" } });
    }
    setBusy(false);
    void load();
  }

  function openPdlActionForSingle(r: SongRow, action: PDLActionType = "urgent_dsp_upload") {
    setPdlSongs([
      {
        id: r.id,
        title: r.title,
        primaryArtist: r.primaryArtist,
        isrc: r.tracks?.[0]?.isrc ?? null,
        upc: r.upc ?? null,
      },
    ]);
    setPdlAction(action);
    setPdlModalOpen(true);
  }

  function openPdlActionForSelected(action: PDLActionType = "urgent_dsp_upload") {
    const selectedRows = items.filter((i) => selected.has(i.id));
    if (selectedRows.length === 0) return;
    setPdlSongs(
      selectedRows.map((r) => ({
        id: r.id,
        title: r.title,
        primaryArtist: r.primaryArtist,
        isrc: r.tracks?.[0]?.isrc ?? null,
        upc: r.upc ?? null,
      })),
    );
    setPdlAction(action);
    setPdlModalOpen(true);
  }

  const pendingReview = (counts.in_review ?? 0) + (counts.revision_requested ?? 0);
  const pageLabel = useMemo(() => {
    if (!total) return "0 songs";
    const from = offset + 1;
    const to = Math.min(offset + limit, total);
    return `${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)}`;
  }, [offset, total]);

  return (
    <AuthGate>
      <PageHeader
        title="Catalogue"
        description="Review and route releases through the delivery pipeline. Open a row for full PDL metadata."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setHistoryModalOpen(true)}
            >
              <History className="size-4" />
              PDL Email History
            </Button>
            <ButtonLink href="/distribution" size="sm" variant="secondary">
              <RadioTower className="size-4" />
              Distribution ops
            </ButtonLink>
          </div>
        }
      />

      {/* Pipeline strip */}
      <div className="mb-5 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-stretch overflow-x-auto">
          {PIPELINE.map((tab, i) => {
            const active = status === tab.value;
            const count =
              tab.value === ""
                ? counts.all ?? total
                : counts[tab.value] ?? 0;
            return (
              <button
                key={tab.value || "all"}
                type="button"
                onClick={() => {
                  setStatus(tab.value);
                  void load(tab.value, q, 0);
                }}
                className={cn(
                  "relative min-w-[7.5rem] flex-1 px-4 py-3.5 text-left transition-colors",
                  i > 0 && "border-l border-line",
                  active ? "bg-brand-soft/60" : "hover:bg-surface-2",
                )}
              >
                <p
                  className={cn(
                    "text-[0.6875rem] font-semibold uppercase tracking-[0.12em]",
                    active ? "text-brand" : "text-ink-subtle",
                  )}
                >
                  {tab.label}
                </p>
                <p className={cn("mt-1 font-display text-xl font-semibold tabular-nums", active ? "text-brand" : "text-ink")}>
                  {formatNumber(count)}
                </p>
                {active ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-2/80 px-4 py-3">
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(draftQ);
              void load(status, draftQ, 0);
            }}
          >
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
              <Input
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                placeholder="Search title, artist, or release ID"
                className="h-9 pl-9"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" disabled={busy}>
              Search
            </Button>
            {q ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraftQ("");
                  setQ("");
                  void load(status, "", 0);
                }}
              >
                <X className="size-4" />
                Clear
              </Button>
            ) : null}
          </form>
          <p className="text-xs text-ink-subtle">
            {pendingReview > 0 ? (
              <span className="text-warning">{formatNumber(pendingReview)} awaiting review · </span>
            ) : null}
            {pageLabel}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand/25 bg-brand-soft/40 p-3 shadow-sm">
          <span className="mr-2 text-sm font-semibold text-brand">{selected.size} selected</span>
          <Button size="sm" variant="success" disabled={busy} onClick={() => void bulkApprove()}>
            <Check className="size-3.5" />
            Approve selected
          </Button>
          <div className="mx-1 h-5 w-px bg-line" />
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => openPdlActionForSelected("urgent_dsp_upload")}
          >
            <Flame className="size-3.5" />
            1. Urgent DSP Email ({selected.size})
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400/40 text-amber-700 hover:bg-amber-50"
            disabled={busy}
            onClick={() => openPdlActionForSelected("youtube_claim_release")}
          >
            <ShieldAlert className="size-3.5" />
            2. YouTube Claim ({selected.size})
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-sky-400/40 text-sky-700 hover:bg-sky-50"
            disabled={busy}
            onClick={() => openPdlActionForSelected("youtube_topic")}
          >
            <Video className="size-3.5" />
            3. YouTube Topic ({selected.size})
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      ) : null}

      {items.length === 0 && !error ? (
        <EmptyState
          icon={<Music2 className="size-6" />}
          title="Nothing in this stage"
          description="Try another pipeline tab or clear your search."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-line-strong"
                      checked={items.length > 0 && selected.size === items.length}
                      onChange={toggleAll}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="px-3 py-3">Release</th>
                  <th className="hidden px-3 py-3 md:table-cell">Genre</th>
                  <th className="hidden px-3 py-3 lg:table-cell">Language</th>
                  <th className="px-3 py-3">Tier</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="hidden px-3 py-3 xl:table-cell">ISRC</th>
                  <th className="hidden px-3 py-3 sm:table-cell">Updated</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((r) => {
                  const isrc = r.tracks?.[0]?.isrc;
                  const active = selected.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "group transition-colors",
                        active ? "bg-brand-soft/35" : "hover:bg-surface-2/80",
                      )}
                    >
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-line-strong"
                          checked={active}
                          onChange={() => toggleSelect(r.id)}
                          aria-label={`Select ${r.title}`}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Link href={`/songs/${r.id}`} className="flex min-w-0 items-center gap-3">
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-surface-3 ring-1 ring-line">
                            {r.artworkUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.artworkUrl} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="grid size-full place-items-center text-ink-subtle">
                                <Disc3 className="size-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[0.875rem] font-semibold text-ink group-hover:text-brand">
                              {r.title}
                            </p>
                            <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
                              {r.primaryArtist}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="hidden px-3 py-3 align-middle text-[0.8125rem] text-ink-muted md:table-cell">
                        {r.genre || "—"}
                      </td>
                      <td className="hidden px-3 py-3 align-middle text-[0.8125rem] text-ink-muted lg:table-cell">
                        {r.language || "—"}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide",
                            r.distributionTier === "premium"
                              ? "bg-brand-soft text-brand"
                              : "bg-surface-3 text-ink-muted",
                          )}
                        >
                          {r.distributionTier === "premium" ? "Premium" : "Free"}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                      </td>
                      <td className="hidden px-3 py-3 align-middle xl:table-cell">
                        {isrc ? (
                          <span className="font-mono text-[0.75rem] text-ink-muted">{isrc}</span>
                        ) : (
                          <span className="text-[0.75rem] text-warning">Missing</span>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 align-middle text-[0.75rem] text-ink-subtle sm:table-cell">
                        {formatDate(r.updatedAt || r.createdAt)}
                      </td>
                      <td className="relative px-3 py-3 align-middle text-right">
                        <button
                          type="button"
                          aria-label="Actions"
                          aria-expanded={menuId === r.id}
                          className="inline-grid size-8 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink"
                          onClick={(e) => {
                            const next = menuId === r.id ? null : r.id;
                            setMenuAnchor(next ? e.currentTarget : null);
                            setMenuId(next);
                          }}
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                        <RowMenu
                          open={menuId === r.id}
                          anchorEl={menuAnchor}
                          onClose={() => {
                            setMenuId(null);
                            setMenuAnchor(null);
                          }}
                          detailHref={`/songs/${r.id}`}
                          distHref={`/distribution/${r.id}`}
                          onPdlAction={(act) => openPdlActionForSingle(r, act)}
                          onApprove={() => void updateStatus(r.id, "approved")}
                          onReject={() => void updateStatus(r.id, "rejected")}
                          onRevision={() => void requestRevision(r.id)}
                          onISRC={() => void assignISRC(r)}
                          onUPC={() => void assignUPC(r)}
                          onLive={() => void updateStatus(r.id, "live")}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={offset === 0 || busy}
              onClick={() => void load(status, q, Math.max(0, offset - limit))}
            >
              Previous
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-subtle">
              {busy ? "Loading…" : pageLabel}
              <ChevronDown className="size-3 opacity-0" aria-hidden />
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={offset + limit >= total || busy}
              onClick={() => void load(status, q, offset + limit)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* PDL Action Modal */}
      <PdlActionModal
        open={pdlModalOpen}
        onClose={() => setPdlModalOpen(false)}
        initialAction={pdlAction}
        songs={pdlSongs}
        onSuccess={() => void load()}
      />

      {/* PDL History Modal */}
      <PdlHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />
    </AuthGate>
  );
}
