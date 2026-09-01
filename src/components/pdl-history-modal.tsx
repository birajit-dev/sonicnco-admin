"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  History,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { PDLEmailLog } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, { label: string; icon: typeof Flame; tone: "danger" | "warning" | "info" }> = {
  urgent_dsp_upload: { label: "1. Urgent DSP Upload", icon: Flame, tone: "danger" },
  youtube_claim_release: { label: "2. YouTube Claim Release", icon: ShieldAlert, tone: "warning" },
  youtube_topic: { label: "3. YouTube Topic", icon: Video, tone: "info" },
};

export function PdlHistoryModal({
  open,
  onClose,
  releaseId,
  releaseTitle,
}: {
  open: boolean;
  onClose: () => void;
  releaseId?: string;
  releaseTitle?: string;
}) {
  const [items, setItems] = useState<PDLEmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>("");

  async function load() {
    setBusy(true);
    setError(null);
    const params = new URLSearchParams({ limit: "50" });
    if (releaseId) params.set("releaseId", releaseId);
    const res = await api<{ items: PDLEmailLog[]; total: number }>(`/admin/pdl/logs?${params}`);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    }
  }

  useEffect(() => {
    if (open) {
      void load();
      setExpandedId(null);
    }
  }, [open, releaseId]);

  if (!open) return null;

  const filteredItems = filterAction
    ? items.filter((i) => i.actionType === filterAction)
    : items;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-line bg-canvas shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-ink">
              <History className="size-5 text-brand" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">
                PDL Communication History
                {releaseTitle ? <span className="font-normal text-ink-muted"> · {releaseTitle}</span> : null}
              </h2>
              <p className="text-xs text-ink-muted">
                Audit trail of automated operations emails sent to PDL Ingestion Desk
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-subtle hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-6 py-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "", label: "All Actions" },
              { id: "urgent_dsp_upload", label: "1. Urgent DSP" },
              { id: "youtube_claim_release", label: "2. YouTube Claims" },
              { id: "youtube_topic", label: "3. YouTube Topic" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterAction(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  filterAction === f.id
                    ? "border-brand bg-brand-soft font-semibold text-brand"
                    : "border-line bg-surface text-ink-muted hover:bg-surface-2",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-subtle">
              {filteredItems.length} log{filteredItems.length !== 1 ? "s" : ""}
            </span>
            <Button size="sm" variant="ghost" onClick={() => void load()} disabled={busy}>
              <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs text-danger">
              {error}
            </div>
          ) : null}

          {filteredItems.length === 0 && !busy ? (
            <div className="py-12 text-center">
              <Mail className="mx-auto size-8 text-ink-subtle" />
              <p className="mt-2 text-sm font-semibold text-ink">No PDL email logs found</p>
              <p className="mt-1 text-xs text-ink-muted">
                Action emails sent from the Admin Panel will be listed here.
              </p>
            </div>
          ) : (
            filteredItems.map((log) => {
              const actionMeta = ACTION_LABELS[log.actionType] || {
                label: log.actionType,
                icon: Mail,
                tone: "neutral" as const,
              };
              const isExpanded = expandedId === log.id;
              const Icon = actionMeta.icon;

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-line bg-surface transition-all overflow-hidden"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="flex cursor-pointer items-start justify-between gap-4 p-4 hover:bg-surface-2/70"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={actionMeta.tone}>{actionMeta.label}</Badge>
                          <Badge tone={log.status === "sent" ? "success" : "danger"}>
                            {log.status === "sent" ? (
                              <CheckCircle2 className="mr-1 size-3" />
                            ) : (
                              <XCircle className="mr-1 size-3" />
                            )}
                            {log.status}
                          </Badge>
                          <span className="text-[0.6875rem] text-ink-subtle">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 font-medium text-ink text-xs">{log.subject}</p>
                        <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
                          To: <span className="font-mono text-ink">{log.recipientEmail}</span>
                          {log.ccEmail ? <span> · CC: <span className="font-mono">{log.ccEmail}</span></span> : null}
                          {log.senderName ? <span> · By: {log.senderName}</span> : null}
                          <span> · {log.songCount} song{log.songCount > 1 ? "s" : ""}</span>
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-brand">
                      {isExpanded ? "Collapse" : "View Details"}
                    </span>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-line bg-surface-2/40 p-4 space-y-3">
                      {log.targetUrl ? (
                        <div className="text-xs">
                          <span className="font-semibold text-ink-subtle">Target YouTube URL: </span>
                          <a
                            href={log.targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-brand underline inline-flex items-center gap-1"
                          >
                            {log.targetUrl}
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      ) : null}

                      {log.customNote ? (
                        <div className="rounded-lg border border-line bg-canvas p-2.5 text-xs">
                          <p className="font-semibold text-ink-subtle">Custom Admin Note:</p>
                          <p className="mt-0.5 text-ink">{log.customNote}</p>
                        </div>
                      ) : null}

                      <div>
                        <p className="mb-1 text-xs font-semibold text-ink-subtle">Included Songs:</p>
                        <p className="text-xs text-ink font-medium">{log.releaseTitles}</p>
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-semibold text-ink-subtle">Email Message Body:</p>
                        <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-canvas p-3 font-mono text-[0.6875rem] text-ink-muted border border-line">
                          {log.bodyText}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-line bg-surface px-6 py-3">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
