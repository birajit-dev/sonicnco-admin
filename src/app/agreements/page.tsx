"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, FileText, Loader2, Plus } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { UserSearchField, type UserSearchHit } from "@/components/user-search-field";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, FormMessage } from "@/components/ui/form";
import { api, openAgreementDocument } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Agreement } from "@/lib/types";

type AgreementRow = Agreement & { type?: string };

export default function AgreementsPage() {
  const [items, setItems] = useState<AgreementRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserSearchHit | null>(null);
  const [title, setTitle] = useState("Sub-Label B2B Licensing Agreement");
  const [templateKey, setTemplateKey] = useState("sub_label");

  async function load() {
    const res = await api<{ items: AgreementRow[] | null; total: number }>("/admin/agreements");
    if (!res.ok) {
      setError(res.error);
      setItems([]);
      return;
    }
    setError(null);
    setItems(res.data.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      setError("Search and select a user first.");
      return;
    }
    setCreating(true);
    setError(null);
    setSuccess(null);
    const res = await api<AgreementRow>("/admin/agreements", {
      method: "POST",
      body: { userId: selectedUser.id, title, templateKey },
    });
    setCreating(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const who =
      res.data.userName ||
      selectedUser.artistName ||
      selectedUser.name;
    setSuccess(
      templateKey === "sub_label"
        ? `Sub-Label B2B created for ${who} (signed by ${res.data.signatureName ?? "user"}).`
        : templateKey === "parent_certificate"
          ? `Parent certificate created for ${who} (signed by ${res.data.signatureName ?? "Buddha Debbarma"}).`
          : "Agreement created.",
    );
    setSelectedUser(null);
    void load();
  }

  async function handleDownload(id: string) {
    setDownloadingId(id);
    setError(null);
    const result = await openAgreementDocument(id);
    setDownloadingId(null);
    if (!result.ok) setError(result.error);
  }

  const statusTone = (s: string) => {
    if (s === "signed" || s === "active") return "success" as const;
    if (s === "void" || s === "expired" || s === "revoked") return "danger" as const;
    if (s === "pending") return "warning" as const;
    return "neutral" as const;
  };

  const templateLabel = (key: string) => {
    if (key === "sub_label") return "Sub-Label B2B";
    if (key === "parent_certificate") return "Parent certificate";
    if (key === "distribution") return "Distribution";
    if (key === "label") return "Label";
    if (key === "premium") return "Premium";
    return key;
  };

  return (
    <AuthGate>
      <PageHeader
        title="Agreements"
        description="Two auto-signed certificates: Sub-Label B2B (artist full name) and Parent (Buddha Debbarma)."
      />
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {success ? <FormMessage tone="success">{success}</FormMessage> : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate agreement</CardTitle>
        </CardHeader>
        <CardBody>
          {templateKey === "sub_label" ? (
            <p className="mb-4 text-sm text-ink-muted">
              <strong>Sub-Label B2B</strong> — “[Artist] X Sonic &amp; Co”. Sub-label letterhead
              (logo or name). Digitally signed by the user’s full legal name.
            </p>
          ) : null}
          {templateKey === "parent_certificate" ? (
            <p className="mb-4 text-sm text-ink-muted">
              <strong>Parent certificate</strong> — “Sonic &amp; Co X [Artist]”. Company
              letterhead. Digitally signed by Buddha Debbarma (Partner). Only the sub-label
              name changes.
            </p>
          ) : null}
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
            <UserSearchField
              value={selectedUser}
              onChange={setSelectedUser}
              required
            />
            <Field label="Template" htmlFor="template">
              <Select
                id="template"
                value={templateKey}
                onChange={(e) => {
                  setTemplateKey(e.target.value);
                  if (e.target.value === "distribution") setTitle("Distribution Agreement");
                  if (e.target.value === "label") setTitle("Label Agreement");
                  if (e.target.value === "sub_label") setTitle("Sub-Label B2B Licensing Agreement");
                  if (e.target.value === "parent_certificate") setTitle("Parent Sub-Label Certificate");
                  if (e.target.value === "premium") setTitle("Premium Distribution Addendum");
                }}
              >
                <option value="sub_label">Sub-Label B2B (user signs)</option>
                <option value="parent_certificate">Parent certificate (Buddha Debbarma)</option>
                <option value="distribution">Distribution</option>
                <option value="label">Label</option>
                <option value="premium">Premium addendum</option>
              </Select>
            </Field>
            <Field label="Title" htmlFor="title" required className="sm:col-span-2">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={creating || !selectedUser}>
                <Plus className="size-4" />
                {creating
                  ? "Working…"
                  : templateKey === "sub_label"
                    ? "Generate & sign Sub-Label B2B"
                    : templateKey === "parent_certificate"
                      ? "Generate & sign Parent certificate"
                      : "Create agreement"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {items.length === 0 && !error ? (
        <EmptyState
          icon={<FileText className="size-6" />}
          title="No agreements yet"
          description="Sub-label agreements appear here automatically after artist signup."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Template</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Signature</th>
                  <th className="px-5 py-3 font-medium">Signed</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3 font-medium text-ink">{a.userName || "—"}</td>
                    <td className="px-5 py-3">{a.type || "Agreement"}</td>
                    <td className="px-5 py-3 text-ink-muted">{templateLabel(a.templateKey)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(a.status)}>
                        <Dot tone={statusTone(a.status)} />
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink">
                      {a.signatureName ? (
                        <span className="font-medium">{a.signatureName}</span>
                      ) : (
                        <span className="text-ink-subtle">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-subtle">
                      {a.signedAt ? formatDate(a.signedAt) : "—"}
                    </td>
                    <td className="px-5 py-3 text-ink-subtle">{formatDate(a.createdAt)}</td>
                    <td className="px-5 py-3">
                      {a.hasDocument ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={downloadingId === a.id}
                          onClick={() => handleDownload(a.id)}
                        >
                          {downloadingId === a.id ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              Opening…
                            </>
                          ) : (
                            <>
                              <Download className="size-3.5" aria-hidden />
                              Download
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-ink-subtle">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AuthGate>
  );
}
