"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { KYCEntry } from "@/lib/types";

export default function KYCPage() {
  const [items, setItems] = useState<KYCEntry[]>([]);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState<string | null>(null);

  async function load(next = status) {
    const q = next ? `?status=${encodeURIComponent(next)}` : "";
    const res = await api<{ items: KYCEntry[] | null; total: number }>(`/admin/kyc${q}`);
    if (!res.ok) {
      setError(res.error);
      setItems([]);
      return;
    }
    setError(null);
    setItems(res.data.items ?? []);
  }

  useEffect(() => {
    void load("pending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id: string, nextStatus: string) {
    const res = await api(`/admin/kyc/${id}`, {
      method: "PATCH",
      body: { status: nextStatus },
    });
    if (!res.ok) setError(res.error);
    else void load();
  }

  const statusTone = (s: string) => {
    if (s === "approved" || s === "verified") return "success" as const;
    if (s === "rejected") return "danger" as const;
    if (s === "pending") return "warning" as const;
    return "neutral" as const;
  };

  return (
    <AuthGate>
      <PageHeader
        title="KYC Documents"
        description="Review and approve identity documents submitted by users."
        actions={
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              void load(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </Select>
        }
      />
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      {items.length === 0 && !error ? (
        <EmptyState
          icon={<Shield className="size-6" />}
          title="No KYC documents in this filter"
          description="Documents submitted for identity verification will appear here."
        />
      ) : items.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Document type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3 font-medium text-ink">{entry.userName || "—"}</td>
                    <td className="px-5 py-3 capitalize">
                      {(entry.documentType || "document").replaceAll("_", " ")}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(entry.status)}>
                        <Dot tone={statusTone(entry.status)} />
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-subtle">
                      {entry.submittedAt ? formatDate(entry.submittedAt) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {entry.documentUrl ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(entry.documentUrl!, "_blank")}
                          >
                            View
                          </Button>
                        ) : null}
                        {entry.status === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => void updateStatus(entry.id, "verified")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => void updateStatus(entry.id, "rejected")}
                            >
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
        </Card>
      ) : null}
    </AuthGate>
  );
}
