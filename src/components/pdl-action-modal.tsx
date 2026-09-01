"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Eye,
  Flame,
  Globe,
  Loader2,
  Mail,
  Send,
  ShieldAlert,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { api } from "@/lib/api";
import type { PDLActionType } from "@/lib/types";
import { cn } from "@/lib/utils";

type SongItem = {
  id: string;
  title: string;
  primaryArtist: string;
  isrc?: string | null;
  upc?: string | null;
};

const ACTION_CONFIGS: Record<
  PDLActionType,
  {
    id: PDLActionType;
    number: number;
    title: string;
    badge: string;
    shortDesc: string;
    icon: typeof Flame;
    color: string;
    bgHover: string;
    activeBorder: string;
  }
> = {
  urgent_dsp_upload: {
    id: "urgent_dsp_upload",
    number: 1,
    title: "1. Urgent Email to PDL for Uploading & DSP Approval",
    badge: "Priority Delivery",
    shortDesc: "Request expedited DSP ingestion, metadata validation, and priority push to all DSP stores.",
    icon: Flame,
    color: "text-danger",
    bgHover: "hover:border-danger/40 hover:bg-danger-soft/20",
    activeBorder: "border-danger bg-danger-soft/30 ring-1 ring-danger",
  },
  youtube_claim_release: {
    id: "youtube_claim_release",
    number: 2,
    title: "2. Email to PDL for YouTube Copyright Claim Removal",
    badge: "Content ID Whitelist",
    shortDesc: "Request immediate removal of automated Content ID claims and video/channel whitelisting.",
    icon: ShieldAlert,
    color: "text-amber-500",
    bgHover: "hover:border-amber-400/40 hover:bg-amber-50/20",
    activeBorder: "border-amber-500 bg-amber-50/40 ring-1 ring-amber-500",
  },
  youtube_topic: {
    id: "youtube_topic",
    number: 3,
    title: "3. Email to PDL for Proceed to YouTube Topic",
    badge: "OAC & Art Track",
    shortDesc: "Request YouTube Topic channel delivery, Art Track creation, and linking to Official Artist Channel.",
    icon: Video,
    color: "text-sky-500",
    bgHover: "hover:border-sky-400/40 hover:bg-sky-50/20",
    activeBorder: "border-sky-500 bg-sky-50/40 ring-1 ring-sky-500",
  },
};

export function PdlActionModal({
  open,
  onClose,
  songs,
  initialAction = "urgent_dsp_upload",
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  songs: SongItem[];
  initialAction?: PDLActionType;
  onSuccess?: () => void;
}) {
  const [actionType, setActionType] = useState<PDLActionType>(initialAction);
  const [recipientEmail, setRecipientEmail] = useState("ops@pdlindia.org");
  const [ccEmail, setCcEmail] = useState("support@sonicn.co");
  const [targetUrl, setTargetUrl] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    subject: string;
    bodyText: string;
    bodyHtml?: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      setActionType(initialAction);
      setError(null);
      setSuccessMsg(null);
      setPreviewData(null);
      setShowPreview(false);

      // Fetch configured PDL emails from platform settings
      void (async () => {
        const res = await api<{ items: { key: string; value: string }[] }>("/admin/settings");
        if (res.ok && res.data.items) {
          const map = Object.fromEntries(res.data.items.map((i) => [i.key, i.value]));
          if (map.pdl_contact_email) setRecipientEmail(map.pdl_contact_email);
          if (map.pdl_cc_email) setCcEmail(map.pdl_cc_email);
        }
      })();
    }
  }, [open, initialAction]);

  if (!open) return null;

  async function loadPreview() {
    setPreviewBusy(true);
    setError(null);
    const res = await api<{
      subject: string;
      bodyText: string;
      bodyHtml?: string;
    }>("/admin/pdl/preview-action", {
      method: "POST",
      body: {
        actionType,
        releaseIds: songs.map((s) => s.id),
        recipientEmail: recipientEmail.trim(),
        ccEmail: ccEmail.trim(),
        customNote: customNote.trim(),
        targetUrl: targetUrl.trim(),
      },
    });
    setPreviewBusy(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      setPreviewData(res.data);
      setShowPreview(true);
    }
  }

  async function handleSend() {
    if (!recipientEmail.trim()) {
      setError("Please specify a recipient email address.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccessMsg(null);

    const res = await api<{
      ok: boolean;
      subject: string;
      songCount: number;
      recipientEmail: string;
    }>("/admin/pdl/send-action", {
      method: "POST",
      body: {
        actionType,
        releaseIds: songs.map((s) => s.id),
        recipientEmail: recipientEmail.trim(),
        ccEmail: ccEmail.trim(),
        customNote: customNote.trim(),
        targetUrl: targetUrl.trim(),
      },
    });

    setBusy(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      setSuccessMsg(`Automated email successfully dispatched to ${res.data.recipientEmail}!`);
      if (onSuccess) onSuccess();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-canvas shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Mail className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">PDL Email Action Dispatcher</h2>
              <p className="text-xs text-ink-muted">
                Trigger official automated operations emails to PDL for {songs.length} song{songs.length > 1 ? "s" : ""}
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

        {/* Modal Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
          {successMsg ? (
            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft/50 p-4 text-sm text-success">
              <Check className="size-5 shrink-0" />
              <div>
                <p className="font-semibold">{successMsg}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Log entry recorded in PDL history and audit log.
                </p>
              </div>
            </div>
          ) : null}

          {/* Selected Songs Banner */}
          <div className="rounded-xl border border-line bg-surface-2/60 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Target Song{songs.length > 1 ? "s" : ""} ({songs.length})
              </span>
              <span className="text-[0.6875rem] text-ink-muted">Metadata will be automatically attached</span>
            </div>
            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
              {songs.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs"
                >
                  <span className="font-medium text-ink">{s.title}</span>
                  <span className="text-ink-muted">· {s.primaryArtist}</span>
                  {s.isrc ? (
                    <span className="font-mono text-[0.6875rem] text-ink-subtle">[{s.isrc}]</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Action Type Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Select PDL Email Action
            </label>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {(Object.keys(ACTION_CONFIGS) as PDLActionType[]).map((key) => {
                const cfg = ACTION_CONFIGS[key];
                const active = actionType === key;
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActionType(key);
                      setPreviewData(null);
                      setShowPreview(false);
                    }}
                    className={cn(
                      "flex flex-col items-start rounded-xl border p-3.5 text-left transition-all",
                      cfg.bgHover,
                      active ? cfg.activeBorder : "border-line bg-surface",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className={cn("grid size-7 place-items-center rounded-lg bg-surface-2", cfg.color)}>
                        <Icon className="size-4" />
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold",
                          active ? "bg-canvas text-ink shadow-sm" : "bg-surface-2 text-ink-muted",
                        )}
                      >
                        Action #{cfg.number}
                      </span>
                    </div>
                    <p className="mt-2.5 text-xs font-semibold text-ink">{cfg.title}</p>
                    <p className="mt-1 text-[0.6875rem] leading-relaxed text-ink-muted">
                      {cfg.shortDesc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Inputs based on Action */}
          {actionType === "youtube_claim_release" ? (
            <Field
              label="Claimed YouTube Video / Channel URL"
              hint="Enter the exact YouTube video URL or Channel link where the claim needs to be released or whitelisted"
            >
              <Input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtube.com/@channel"
              />
            </Field>
          ) : null}

          {/* Recipient & CC Fields */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="PDL Recipient Email"
              hint="Primary operations email at PDL (editable in Admin Settings)"
            >
              <Input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="ops@pdlindia.org"
              />
            </Field>

            <Field
              label="CC Email (Copies)"
              hint="Internal team copies / logging address"
            >
              <Input
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="support@sonicn.co"
              />
            </Field>
          </div>

          {/* Custom Note / Instructions */}
          <Field
            label="Additional Notes / Priority Instructions (Optional)"
            hint="Add custom references, OAC channel links, target release dates, or dispute notes"
          >
            <Textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Please expedite approval for Friday drop, or reference dispute ID #..."
            />
          </Field>

          {/* Email Preview Accordion */}
          {showPreview && previewData ? (
            <div className="rounded-xl border border-line bg-surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-brand" />
                  <span className="text-xs font-semibold text-ink">Formatted Email Preview</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="text-xs text-ink-subtle hover:text-ink"
                >
                  Hide
                </button>
              </div>
              <div className="space-y-2 p-4 text-xs">
                <div>
                  <span className="font-semibold text-ink-subtle">Subject: </span>
                  <span className="font-medium text-ink">{previewData.subject}</span>
                </div>
                <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-surface-3 p-3 font-mono text-[0.75rem] text-ink-muted">
                  {previewData.bodyText}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy || previewBusy}
              onClick={() => void loadPreview()}
            >
              {previewBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Eye className="size-4" />
              )}
              {showPreview ? "Refresh Preview" : "Preview Email"}
            </Button>
            <Link href="/pdl-templates" className="text-xs font-medium text-brand hover:underline">
              Edit email templates
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy || !recipientEmail.trim()}
              onClick={() => void handleSend()}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending to PDL…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Send Email to PDL
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
