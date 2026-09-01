"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  IndianRupee,
  Mic2,
  Music,
  Shield,
  Wallet,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatINR, formatNumber } from "@/lib/format";
import type { Overview } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await api<Overview>("/admin/overview");
      if (!res.ok) setError(res.error);
      else setData(res.data);
    })();
  }, []);

  const s = data?.stats ?? {};

  return (
    <AuthGate>
      <PageHeader
        title="Dashboard"
        description="Artists, production companies, catalogue, revenue, and payouts."
      />
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Artists"
          value={formatNumber(s.artists ?? 0)}
          icon={<Mic2 className="size-4" />}
          accent="brand"
        />
        <StatCard
          label="Production Companies"
          value={formatNumber(s.productionCompanies ?? 0)}
          icon={<Building2 className="size-4" />}
          accent="info"
        />
        <StatCard
          label="Total Songs"
          value={formatNumber(s.songs ?? s.releases ?? 0)}
          icon={<Music className="size-4" />}
          accent="success"
        />
        <StatCard
          label="Pending Reviews"
          value={formatNumber(s.pendingReviews ?? s.releasesInReview ?? 0)}
          icon={<Shield className="size-4" />}
          accent="warning"
        />
        <StatCard
          label="Approved Songs"
          value={formatNumber(s.approvedSongs ?? 0)}
          icon={<Shield className="size-4" />}
          accent="success"
        />
        <StatCard
          label="Live Releases"
          value={formatNumber(s.liveReleases ?? 0)}
          icon={<BarChart3 className="size-4" />}
          accent="success"
        />
        <StatCard
          label="Monthly Revenue"
          value={formatINR(s.monthlyRevenuePaise ?? 0)}
          icon={<IndianRupee className="size-4" />}
          accent="brand"
        />
        <StatCard
          label="Pending Withdrawals"
          value={formatNumber(s.pendingWithdrawals ?? s.payoutsOpen ?? 0)}
          hint="Open requests"
          icon={<Wallet className="size-4" />}
          accent="warning"
        />
      </div>
      {!data && !error ? (
        <p className="mt-6 text-sm text-ink-muted">Loading…</p>
      ) : null}
    </AuthGate>
  );
}
