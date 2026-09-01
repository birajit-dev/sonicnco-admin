"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";

type SettingItem = {
  key: string;
  value: string;
  valueType: string;
  label: string;
  description: string | null;
};

type Tab = "general" | "email" | "pdl" | "pricing" | "integrations";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "email", label: "Email / SMTP" },
  { id: "pdl", label: "PDL Operations" },
  { id: "pricing", label: "Revenue" },
  { id: "integrations", label: "Integrations" },
];

const EMAIL_KEYS = new Set([
  "support_email",
  "smtp_host",
  "smtp_port",
  "smtp_username",
  "smtp_password",
  "smtp_from_email",
  "smtp_from_name",
  "smtp_tls",
]);
const PDL_KEYS = new Set(["pdl_contact_email", "pdl_cc_email"]);
const GENERAL_KEYS = new Set(["site_name", "support_email", "maintenance_mode"]);
const INTEGRATION_KEYS = new Set(["google_oauth_enabled"]);
const PRICING_PREFIXES = [
  "premium_",
  "free_",
  "min_withdrawal",
  "payment_processing",
  "tax_deduction",
  "platform_commission",
];

function isPricingKey(key: string) {
  return PRICING_PREFIXES.some((p) => key.startsWith(p) || key === p || key.includes(p));
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [items, setItems] = useState<SettingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("admin@sonicn.co");
  const [testing, setTesting] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [testMeta, setTestMeta] = useState<string | null>(null);

  async function load() {
    const res = await api<{ items: SettingItem[] }>("/admin/settings");
    if (!res.ok) setError(res.error);
    else {
      setError(null);
      setItems(res.data.items);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    return items.filter((item) => {
      if (tab === "email") return EMAIL_KEYS.has(item.key);
      if (tab === "pdl") return PDL_KEYS.has(item.key);
      if (tab === "general") return GENERAL_KEYS.has(item.key);
      if (tab === "integrations") return INTEGRATION_KEYS.has(item.key);
      if (tab === "pricing") return isPricingKey(item.key);
      return false;
    });
  }, [items, tab]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const settings: Record<string, string> = {};
    for (const item of items) settings[item.key] = item.value;
    const res = await api<{ items: SettingItem[] }>("/admin/settings", {
      method: "PUT",
      body: { settings },
    });
    setSaving(false);
    if (!res.ok) setError(res.error);
    else {
      setItems(res.data.items);
      setSuccess("Settings saved.");
    }
  }

  async function sendTestEmail() {
    setError(null);
    setSuccess(null);
    setTestLog([]);
    setTestMeta(null);
    setTesting(true);

    const settings: Record<string, string> = {};
    for (const item of items) {
      if (EMAIL_KEYS.has(item.key) && item.key.startsWith("smtp_")) {
        settings[item.key] = item.value;
      }
    }

    const res = await api<{
      ok: boolean;
      to: string;
      error?: string;
      hint?: string;
      message?: string;
      durationMs?: number;
      log?: string[];
      config?: Record<string, unknown>;
      mode?: string;
    }>("/admin/settings/test-email", {
      method: "POST",
      body: { to: testTo, settings },
    });
    setTesting(false);

    if (!res.ok) {
      setError(res.error);
      setTestLog([`Request failed: ${res.error}`]);
      return;
    }

    const data = res.data;
    setTestLog(data.log ?? []);
    const cfg = data.config
      ? `host=${data.config.host} port=${data.config.port} user=${data.config.username} from=${data.config.fromEmail} passwordSet=${data.config.passwordSet} (${data.durationMs ?? 0}ms)`
      : null;
    setTestMeta(cfg);

    if (data.ok) {
      setSuccess(data.message ?? `Test email sent to ${data.to}.`);
    } else {
      setError([data.error, data.hint].filter(Boolean).join(" — "));
    }
  }

  function updateValue(key: string, value: string) {
    setItems((prev) => prev.map((row) => (row.key === key ? { ...row, value } : row)));
  }

  return (
    <AuthGate>
      <PageHeader
        title="Settings"
        description="Email/SMTP, site options, revenue rules, and integrations — editable without code changes."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSuccess(null);
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

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {success ? <FormMessage tone="success">{success}</FormMessage> : null}

      <form onSubmit={onSave} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>
              {tab === "email"
                ? "Email / SMTP"
                : tab === "pdl"
                  ? "PDL Operations & Distribution Email"
                  : tab === "pricing"
                    ? "Revenue configuration"
                    : tab === "integrations"
                      ? "Integrations"
                      : "General"}
            </CardTitle>
            <CardDescription>
              {tab === "email"
                ? "Used for OTP, welcome mail, password reset, and contact replies via the asynq worker."
                : tab === "pdl"
                  ? "Email destination and CC addresses for automated PDL operations actions (Urgent DSP Upload, YouTube Copyright Claim Removal, YouTube Topic Delivery)."
                  : "Changes apply immediately after save."}
            </CardDescription>
          </CardHeader>
          <CardBody className="grid gap-5 sm:grid-cols-2">
            {tab === "pdl" ? (
              <div className="rounded-lg border border-brand/30 bg-brand-soft/40 px-4 py-3 text-sm text-ink sm:col-span-2">
                <p className="font-semibold text-brand">Automated PDL Action Emails</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Configure who receives PDL emails here. To edit the email subject and body text (Dear PDL, song blocks, sign-off), use the{" "}
                  <Link href="/pdl-templates" className="font-semibold text-brand underline">
                    PDL email templates
                  </Link>{" "}
                  page.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink">
                  <li><strong>Action 1:</strong> Urgent Email to PDL for Uploading to DSPs and approved the song</li>
                  <li><strong>Action 2:</strong> Email to PDL Claim to be removed from YouTube as copyright</li>
                  <li><strong>Action 3:</strong> Email to PDL for Proceed to YouTube Topic &amp; Art Track</li>
                </ul>
              </div>
            ) : null}
            {tab === "email" ? (
              <div className="rounded-lg border border-warning/30 bg-warning-soft/60 px-4 py-3 text-sm text-ink sm:col-span-2">
                <p className="font-semibold text-ink">Gmail setup (fixes 535 BadCredentials)</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-ink-muted">
                  <li>
                    Turn on 2-Step Verification for the Gmail account:{" "}
                    <a
                      className="text-brand underline"
                      href="https://myaccount.google.com/signinoptions/two-step-verification"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Google 2-Step Verification
                    </a>
                  </li>
                  <li>
                    Create an{" "}
                    <a
                      className="text-brand underline"
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                    >
                      App Password
                    </a>{" "}
                    (App: Mail). Copy the 16-character password.
                  </li>
                  <li>
                    Use these values — <strong className="text-ink">not</strong> your normal Gmail
                    password:
                    <ul className="mt-1 list-disc pl-4">
                      <li>SMTP host: <code className="text-ink">smtp.gmail.com</code></li>
                      <li>Port: <code className="text-ink">587</code></li>
                      <li>Username: full address e.g. <code className="text-ink">you@gmail.com</code></li>
                      <li>Password: the 16-char App Password</li>
                      <li>From email: same Gmail address (or a verified alias)</li>
                      <li>SMTP TLS: Enabled</li>
                    </ul>
                  </li>
                </ol>
              </div>
            ) : null}
            {visible.length === 0 ? (
              <p className="text-sm text-ink-muted sm:col-span-2">
                No settings in this group yet. Apply migration 003 if Email fields are missing.
              </p>
            ) : null}
            {visible.map((item) => (
              <Field
                key={item.key}
                label={item.label}
                htmlFor={item.key}
                hint={item.description ?? undefined}
              >
                {item.valueType === "bool" ? (
                  <Select
                    id={item.key}
                    value={item.value}
                    onChange={(e) => updateValue(item.key, e.target.value)}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </Select>
                ) : (
                  <Input
                    id={item.key}
                    type={
                      item.key.includes("password")
                        ? "password"
                        : item.valueType === "int"
                          ? "number"
                          : "text"
                    }
                    value={item.value}
                    onChange={(e) => updateValue(item.key, e.target.value)}
                    autoComplete="off"
                  />
                )}
              </Field>
            ))}
          </CardBody>
        </Card>

        {tab === "email" ? (
          <Card>
            <CardHeader>
              <CardTitle>Send test email</CardTitle>
              <CardDescription>
                Sends immediately over SMTP (no worker required) and shows the full connection log below.
                Uses the values currently in the form — Save is optional for this test.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field label="Recipient" htmlFor="testTo" className="flex-1">
                  <Input
                    id="testTo"
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="you@gmail.com"
                  />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={testing || !testTo.trim()}
                  onClick={() => void sendTestEmail()}
                >
                  {testing ? "Sending…" : "Send test email now"}
                </Button>
              </div>

              {testMeta ? (
                <p className="font-mono text-[0.75rem] text-ink-subtle">{testMeta}</p>
              ) : null}

              {testLog.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-line bg-ink text-[0.75rem] text-white">
                  <div className="border-b border-white/10 px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-white/60">
                    SMTP test log
                  </div>
                  <pre className="max-h-64 overflow-auto px-3 py-3 font-mono leading-relaxed text-white/90">
                    {testLog.join("\n")}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  Enter a recipient and click Send — success or the exact SMTP error (e.g. 535 BadCredentials)
                  will appear here.
                </p>
              )}
            </CardBody>
          </Card>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Reload
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </AuthGate>
  );
}
