"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, RotateCcw, Save } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormMessage, Textarea } from "@/components/ui/form";
import { api } from "@/lib/api";

type ActionTemplates = {
  subjectSingle: string;
  subjectBulk: string;
  body: string;
};

type TemplateConfig = {
  songBlock: string;
  customNoteBlock: string;
  targetUrlBlock: string;
  urgentDspUpload: ActionTemplates;
  youtubeClaimRelease: ActionTemplates;
  youtubeTopic: ActionTemplates;
};

type TabId = "shared" | "urgent_dsp_upload" | "youtube_claim_release" | "youtube_topic";

const TABS: { id: TabId; label: string }[] = [
  { id: "shared", label: "Shared blocks" },
  { id: "urgent_dsp_upload", label: "1. Urgent DSP upload" },
  { id: "youtube_claim_release", label: "2. YouTube claim removal" },
  { id: "youtube_topic", label: "3. YouTube Topic" },
];

export default function PDLTemplatesPage() {
  const [tab, setTab] = useState<TabId>("shared");
  const [templates, setTemplates] = useState<TemplateConfig | null>(null);
  const [defaults, setDefaults] = useState<TemplateConfig | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; bodyText: string } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  async function load() {
    const res = await api<{
      templates: TemplateConfig;
      defaults: TemplateConfig;
      placeholders: string[];
    }>("/admin/pdl/templates");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setTemplates(res.data.templates);
    setDefaults(res.data.defaults);
    setPlaceholders(res.data.placeholders);
  }

  useEffect(() => {
    void load();
  }, []);

  const actionKey = useMemo(() => {
    if (tab === "urgent_dsp_upload") return "urgentDspUpload" as const;
    if (tab === "youtube_claim_release") return "youtubeClaimRelease" as const;
    if (tab === "youtube_topic") return "youtubeTopic" as const;
    return null;
  }, [tab]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!templates) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await api<{ ok: boolean; templates: TemplateConfig }>("/admin/pdl/templates", {
      method: "PUT",
      body: templates,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTemplates(res.data.templates);
    setSuccess("PDL email templates saved.");
    setPreview(null);
  }

  async function onReset() {
    if (!window.confirm("Reset all PDL email templates to the built-in defaults?")) return;
    setResetting(true);
    setError(null);
    setSuccess(null);
    const res = await api<{ ok: boolean; templates: TemplateConfig }>("/admin/pdl/templates/reset", {
      method: "POST",
    });
    setResetting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTemplates(res.data.templates);
    setSuccess("Templates reset to defaults.");
    setPreview(null);
  }

  async function runPreview() {
    if (!templates || tab === "shared") return;
    setPreviewBusy(true);
    setError(null);
    // Save draft first so preview uses latest text
    await api("/admin/pdl/templates", { method: "PUT", body: templates });
    const res = await api<{ subject: string; bodyText: string }>("/admin/pdl/templates/preview", {
      method: "POST",
      body: { actionType: tab },
    });
    setPreviewBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPreview({ subject: res.data.subject, bodyText: res.data.bodyText });
  }

  function updateShared(field: "songBlock" | "customNoteBlock" | "targetUrlBlock", value: string) {
    setTemplates((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function updateAction(field: keyof ActionTemplates, value: string) {
    if (!actionKey || !templates) return;
    setTemplates({
      ...templates,
      [actionKey]: { ...templates[actionKey], [field]: value },
    });
  }

  function restoreActionDefaults() {
    if (!actionKey || !defaults || !templates) return;
    setTemplates({ ...templates, [actionKey]: defaults[actionKey] });
  }

  return (
    <AuthGate>
      <PageHeader
        title="PDL email templates"
        description="Edit the automated email text sent to PDL from the Songs catalogue. Use placeholders like {{title}} and {{songs_block}}."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={resetting} onClick={() => void onReset()}>
              <RotateCcw className="size-4" />
              Reset all to defaults
            </Button>
            <ButtonLink href="/settings" size="sm" variant="ghost">
              PDL email settings
            </ButtonLink>
          </div>
        }
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {success ? <FormMessage tone="success">{success}</FormMessage> : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPreview(null);
            }}
            className={
              tab === t.id
                ? "rounded-full bg-brand-soft px-3.5 py-1.5 text-[0.8125rem] font-medium text-brand"
                : "rounded-full border border-line px-3.5 py-1.5 text-[0.8125rem] text-ink-muted hover:bg-surface-2"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {!templates ? (
        <p className="text-sm text-ink-muted">Loading templates…</p>
      ) : (
        <form onSubmit={onSave} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            {tab === "shared" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Shared blocks</CardTitle>
                  <CardDescription>
                    These snippets are reused across all three PDL email actions.
                  </CardDescription>
                </CardHeader>
                <CardBody className="space-y-4">
                  <Field label="Song block" hint="Repeated once per selected song">
                    <Textarea
                      rows={8}
                      value={templates.songBlock}
                      onChange={(e) => updateShared("songBlock", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>
                  <Field label="Custom note block" hint="Shown when admin adds a priority note">
                    <Textarea
                      rows={5}
                      value={templates.customNoteBlock}
                      onChange={(e) => updateShared("customNoteBlock", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>
                  <Field label="YouTube URL block" hint="Used for YouTube claim removal emails">
                    <Textarea
                      rows={4}
                      value={templates.targetUrlBlock}
                      onChange={(e) => updateShared("targetUrlBlock", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>
                </CardBody>
              </Card>
            ) : actionKey ? (
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle>{TABS.find((t) => t.id === tab)?.label}</CardTitle>
                    <CardDescription>
                      Subject lines and body for this automail action. Salutation and sign-off live in the body template.
                    </CardDescription>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={restoreActionDefaults}>
                    Restore tab defaults
                  </Button>
                </CardHeader>
                <CardBody className="space-y-4">
                  <Field label="Subject (single song)">
                    <Textarea
                      rows={2}
                      value={templates[actionKey].subjectSingle}
                      onChange={(e) => updateAction("subjectSingle", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>
                  <Field label="Subject (multiple songs)">
                    <Textarea
                      rows={2}
                      value={templates[actionKey].subjectBulk}
                      onChange={(e) => updateAction("subjectBulk", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>
                  <Field label="Email body">
                    <Textarea
                      rows={16}
                      value={templates[actionKey].body}
                      onChange={(e) => updateAction("body", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" disabled={previewBusy} onClick={() => void runPreview()}>
                      <Mail className="size-4" />
                      {previewBusy ? "Generating preview…" : "Preview with sample song"}
                    </Button>
                  </div>
                  {preview ? (
                    <div className="rounded-lg border border-line bg-surface-2/50 p-4">
                      <p className="text-xs font-semibold text-ink-subtle">Preview subject</p>
                      <p className="mt-1 text-sm font-medium text-ink">{preview.subject}</p>
                      <p className="mt-4 text-xs font-semibold text-ink-subtle">Preview body</p>
                      <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs text-ink-muted">
                        {preview.bodyText}
                      </pre>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                <Save className="size-4" />
                {saving ? "Saving…" : "Save templates"}
              </Button>
            </div>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Placeholders</CardTitle>
                <CardDescription>Use these tags in any template field.</CardDescription>
              </CardHeader>
              <CardBody>
                <ul className="space-y-1.5 font-mono text-[0.6875rem] text-ink-muted">
                  {placeholders.map((p) => (
                    <li key={p} className="rounded bg-surface-2 px-2 py-1 text-ink">
                      {p}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tips</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2 text-xs text-ink-muted">
                <p>
                  <code className="text-ink">{"{{songs_block}}"}</code> expands using the shared song block for each selected release.
                </p>
                <p>
                  <code className="text-ink">{"{{custom_note_block}}"}</code> is empty when no note is added in the send modal.
                </p>
                <p>
                  PDL recipient emails are configured under{" "}
                  <Link href="/settings" className="text-brand underline">
                    Settings → PDL Operations
                  </Link>
                  .
                </p>
              </CardBody>
            </Card>
          </aside>
        </form>
      )}
    </AuthGate>
  );
}
