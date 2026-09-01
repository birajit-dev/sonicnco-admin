"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatINR, formatDate } from "@/lib/format";
import type { AdminPayout } from "@/lib/types";

export default function PayoutsPage() {
  const [items, setItems] = useState<AdminPayout[]>([]);
  const [status, setStatus] = useState("requested");
  const [error, setError] = useState<string | null>(null);

  async function load(next = status) {
    const q = next ? `?status=${encodeURIComponent(next)}` : "";
    const res = await api<{ items: AdminPayout[]; total: number }>(`/admin/payouts${q}`);
    if (!res.ok) setError(res.error);
    else {
      setError(null);
      setItems(res.data.items ?? []);
    }
  }

  useEffect(() => {
    void load("requested");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function update(id: string, nextStatus: string) {
    const note =
      nextStatus === "rejected" ? window.prompt("Rejection note (optional)") ?? undefined : undefined;
    const res = await api(`/admin/payouts/${id}`, {
      method: "PATCH",
      body: { status: nextStatus, note },
    });
    if (!res.ok) setError(res.error);
    else void load();
  }

  const tone = (s: string) => {
    if (s === "paid" || s === "completed") return "success" as const;
    if (s === "rejected") return "danger" as const;
    return "warning" as const;
  };

  return (
    <AuthGate>
      <PageHeader
        title="Payouts"
        description="Approve or reject artist withdrawal requests."
        actions={
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              void load(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="requested">Requested</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </Select>
        }
      />
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      {items.length === 0 && !error ? (
        <EmptyState
          icon={<Wallet className="size-6" />}
          title="No payouts in this filter"
          description="Withdrawal requests from artists will appear here."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Destination</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Requested</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3 font-mono text-xs">{p.reference}</td>
                    <td className="px-5 py-3 font-medium">{formatINR(p.amountPaise)}</td>
                    <td className="px-5 py-3 capitalize">{p.method.replaceAll("_", " ")}</td>
                    <td className="px-5 py-3 text-ink-muted">{p.destination}</td>
                    <td className="px-5 py-3">
                      <Badge tone={tone(p.status)}>
                        <Dot tone={tone(p.status)} />
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-subtle">{formatDate(p.requestedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="success" onClick={() => void update(p.id, "paid")}>
                          Mark paid
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void update(p.id, "approved")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void update(p.id, "rejected")}>
                          Reject
                        </Button>
                      </div>
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
