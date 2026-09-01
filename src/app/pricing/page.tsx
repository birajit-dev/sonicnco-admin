"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";

type SettingItem = {
  key: string;
  value: string;
  valueType: string;
  label: string;
  description: string | null;
};

export default function PricingPage() {
  const [items, setItems] = useState<SettingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
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
      setSuccess(true);
    }
  }

  return (
    <AuthGate>
      <PageHeader
        title="Pricing & revenue"
        description="Free tier is 60/40. Premium is ₹499/song at 90/10. All values are editable without code changes."
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {success ? <FormMessage tone="success">Settings saved.</FormMessage> : null}

      {!items.length && !error ? (
        <p className="text-sm text-ink-muted">Loading settings…</p>
      ) : null}

      {items.length > 0 ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Platform configuration</CardTitle>
              <CardDescription>
                Amounts in paise (₹1 = 100). Shares in basis points (6000 = 60%).
              </CardDescription>
            </CardHeader>
            <CardBody className="grid gap-5 sm:grid-cols-2">
              {items.map((item) => (
                <Field
                  key={item.key}
                  label={item.label}
                  htmlFor={item.key}
                  hint={item.description ?? undefined}
                >
                  <Input
                    id={item.key}
                    type={item.valueType === "int" ? "number" : "text"}
                    value={item.value}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row) =>
                          row.key === item.key ? { ...row, value: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
              ))}
            </CardBody>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      ) : null}
    </AuthGate>
  );
}
