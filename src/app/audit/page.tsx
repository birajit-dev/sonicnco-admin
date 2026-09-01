"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

export default function AuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await api<{ items: AuditEntry[]; total: number }>("/admin/audit");
      if (!res.ok) setError(res.error);
      else setItems(res.data.items ?? []);
    })();
  }, []);

  return (
    <AuthGate>
      <PageHeader
        title="Audit Log"
        description="Track administrative actions across users, releases, payouts, and settings."
      />
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      {items.length === 0 && !error ? (
        <EmptyState
          icon={<ScrollText className="size-6" />}
          title="No audit entries yet"
          description="Actions like approving releases or changing settings will show up here."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Actor</th>
                  <th className="px-5 py-3 font-medium">Target</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                  <th className="px-5 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((entry) => (
                  <tr key={String(entry.id)} className="hover:bg-surface-2">
                    <td className="px-5 py-3 font-medium text-ink">{entry.action}</td>
                    <td className="px-5 py-3 font-mono text-xs">{entry.actor}</td>
                    <td className="px-5 py-3 text-ink-muted">{entry.target || "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-subtle">
                      {entry.details || "—"}
                    </td>
                    <td className="px-5 py-3 text-ink-subtle">{formatDate(entry.createdAt)}</td>
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
