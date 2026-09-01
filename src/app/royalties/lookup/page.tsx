"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardBody, StatCard } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatINR, formatNumber, formatDate } from "@/lib/format";

type UserRow = {
  userId: string;
  userName: string;
  email: string;
  accountType: string;
  status: string;
  thisMonthArtistPaise: number;
  thisMonthGrossPaise: number;
  thisMonthStreams: number;
  lifetimeArtistPaise: number;
  lifetimeGrossPaise: number;
  lifetimeStreams: number;
  availableBalancePaise: number;
  processingBalancePaise: number;
  paidOutPaise: number;
  pendingPayoutPaise: number;
  payoutAvailablePaise: number;
  minPayoutPaise: number;
  releaseCount: number;
};

type SongRow = {
  releaseId: string;
  title: string;
  primaryArtist: string;
  artworkUrl: string | null;
  genre: string;
  status: string;
  distributionTier: string;
  premiumUpgradedAt: string | null;
  userId: string;
  userName: string;
  email: string;
  thisMonthArtistPaise: number;
  thisMonthGrossPaise: number;
  thisMonthStreams: number;
  lifetimeArtistPaise: number;
  lifetimeGrossPaise: number;
  lifetimeStreams: number;
  catalogueStreams: number;
  catalogueEarnings: number;
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function RoyaltyLookupPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [period, setPeriod] = useState(currentPeriod());
  const [periods, setPeriods] = useState<string[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [selectedSong, setSelectedSong] = useState<SongRow | null>(null);

  useEffect(() => {
    void api<{ periods: string[] }>("/admin/royalties/meta/periods").then((res) => {
      if (res.ok) {
        const list = res.data.periods ?? [];
        setPeriods(list);
        if (list.length && !list.includes(period)) setPeriod(list[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) {
      setError("Enter a song title, artist name, username, or email.");
      return;
    }
    setBusy(true);
    setError(null);
    setSelectedUser(null);
    setSelectedSong(null);
    const params = new URLSearchParams({
      q: q.trim(),
      type,
      period,
    });
    const res = await api<{ users: UserRow[] | null; songs: SongRow[] | null }>(
      `/admin/royalties/lookup?${params}`,
    );
    setBusy(false);
    setSearched(true);
    if (!res.ok) {
      setError(res.error);
      setUsers([]);
      setSongs([]);
      return;
    }
    setUsers(res.data.users ?? []);
    setSongs(res.data.songs ?? []);
  }

  return (
    <AuthGate>
      <PageHeader
        title="Earnings lookup"
        description="Search by song title or username — this month, lifetime, available balance, and payout-ready amounts."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/royalties" size="sm" variant="ghost">
              Statements
            </ButtonLink>
            <ButtonLink href="/royalties/monthly" size="sm" variant="outline">
              Monthly report
            </ButtonLink>
          </div>
        }
      />

      <Card className="mb-6">
        <CardBody>
          <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={(e) => void search(e)}>
            <label className="min-w-0 flex-1 space-y-1.5">
              <span className="text-xs font-medium text-ink-muted">Search</span>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Song title, artist, username, or email"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-ink-muted">Look in</span>
              <Select value={type} onChange={(e) => setType(e.target.value)} className="min-w-36">
                <option value="all">Users & songs</option>
                <option value="user">Users only</option>
                <option value="song">Songs only</option>
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-ink-muted">This month</span>
              <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="min-w-32">
                {(periods.length ? periods : [period]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" disabled={busy}>
              <Search className="size-4" />
              {busy ? "Searching…" : "Search"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      {searched && !users.length && !songs.length && !error ? (
        <EmptyState
          icon={<Search className="size-6" />}
          title="No matches"
          description="Try another name, song title, or email."
        />
      ) : null}

      {users.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Users</h2>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[0.8125rem]">
                  <thead className="border-b border-line bg-surface-2 text-ink-muted">
                    <tr>
                      <th className="px-5 py-3 font-medium">User</th>
                      <th className="px-5 py-3 font-medium">This month</th>
                      <th className="px-5 py-3 font-medium">Lifetime</th>
                      <th className="px-5 py-3 font-medium">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {users.map((u) => (
                      <tr
                        key={u.userId}
                        className="cursor-pointer hover:bg-surface-2"
                        onClick={() => {
                          setSelectedUser(u);
                          setSelectedSong(null);
                        }}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-ink">{u.userName}</div>
                          <div className="text-xs text-ink-subtle">{u.email}</div>
                        </td>
                        <td className="px-5 py-3 font-medium">{formatINR(u.thisMonthArtistPaise)}</td>
                        <td className="px-5 py-3">{formatINR(u.lifetimeArtistPaise)}</td>
                        <td className="px-5 py-3 text-success">{formatINR(u.availableBalancePaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {selectedUser ? (
              <div className="space-y-4">
                <div>
                  <p className="font-display text-xl font-semibold text-ink">{selectedUser.userName}</p>
                  <p className="text-sm text-ink-muted">
                    {selectedUser.email} · {selectedUser.accountType} · {selectedUser.releaseCount} releases
                  </p>
                  <div className="mt-2">
                    <Badge tone={selectedUser.status === "active" ? "success" : "danger"}>
                      <Dot tone={selectedUser.status === "active" ? "success" : "danger"} />
                      {selectedUser.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard
                    label={`This month (${period})`}
                    value={formatINR(selectedUser.thisMonthArtistPaise)}
                    hint={`${formatNumber(selectedUser.thisMonthStreams)} streams · gross ${formatINR(selectedUser.thisMonthGrossPaise)}`}
                    accent="brand"
                  />
                  <StatCard
                    label="Lifetime earnings"
                    value={formatINR(selectedUser.lifetimeArtistPaise)}
                    hint={`${formatNumber(selectedUser.lifetimeStreams)} streams · gross ${formatINR(selectedUser.lifetimeGrossPaise)}`}
                    accent="success"
                  />
                  <StatCard
                    label="Available balance"
                    value={formatINR(selectedUser.availableBalancePaise)}
                    hint={`Processing ${formatINR(selectedUser.processingBalancePaise)}`}
                    accent="info"
                  />
                  <StatCard
                    label="Payout available"
                    value={formatINR(selectedUser.payoutAvailablePaise)}
                    hint={
                      selectedUser.payoutAvailablePaise >= selectedUser.minPayoutPaise
                        ? `Ready (min ${formatINR(selectedUser.minPayoutPaise)})`
                        : `Below min ${formatINR(selectedUser.minPayoutPaise)}`
                    }
                    accent="warning"
                  />
                  <StatCard
                    label="Paid out"
                    value={formatINR(selectedUser.paidOutPaise)}
                    hint={`Pending requests ${formatINR(selectedUser.pendingPayoutPaise)}`}
                    accent="info"
                  />
                </div>
              </div>
            ) : (
              <Card>
                <CardBody>
                  <p className="text-sm text-ink-muted">Select a user to see balances and payout detail.</p>
                </CardBody>
              </Card>
            )}
          </div>
        </section>
      ) : null}

      {songs.length > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Songs</h2>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[0.8125rem]">
                  <thead className="border-b border-line bg-surface-2 text-ink-muted">
                    <tr>
                      <th className="px-5 py-3 font-medium">Song</th>
                      <th className="px-5 py-3 font-medium">Owner</th>
                      <th className="px-5 py-3 font-medium">This month</th>
                      <th className="px-5 py-3 font-medium">Lifetime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {songs.map((s) => (
                      <tr
                        key={s.releaseId}
                        className="cursor-pointer hover:bg-surface-2"
                        onClick={() => {
                          setSelectedSong(s);
                          setSelectedUser(null);
                        }}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="size-10 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
                              {s.artworkUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={s.artworkUrl} alt="" className="size-full object-cover" />
                              ) : null}
                            </div>
                            <div>
                              <div className="font-medium text-ink">{s.title}</div>
                              <div className="text-xs text-ink-subtle">{s.primaryArtist}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-ink-muted">{s.userName}</td>
                        <td className="px-5 py-3 font-medium">{formatINR(s.thisMonthArtistPaise)}</td>
                        <td className="px-5 py-3">{formatINR(s.lifetimeArtistPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {selectedSong ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
                    {selectedSong.artworkUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedSong.artworkUrl} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold text-ink">{selectedSong.title}</p>
                    <p className="text-sm text-ink-muted">
                      {selectedSong.primaryArtist} · {selectedSong.userName}
                    </p>
                    <p className="mt-1 text-xs text-ink-subtle">{selectedSong.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={selectedSong.distributionTier === "premium" ? "brand" : "neutral"}>
                        {selectedSong.distributionTier === "premium" ? "Premium 90/10" : "Free 60/40"}
                      </Badge>
                      <Badge tone="neutral">{selectedSong.status}</Badge>
                      {selectedSong.premiumUpgradedAt ? (
                        <Badge tone="info">Upgraded {formatDate(selectedSong.premiumUpgradedAt)}</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard
                    label={`This month (${period})`}
                    value={formatINR(selectedSong.thisMonthArtistPaise)}
                    hint={`${formatNumber(selectedSong.thisMonthStreams)} streams · gross ${formatINR(selectedSong.thisMonthGrossPaise)}`}
                    accent="brand"
                  />
                  <StatCard
                    label="Lifetime (ledger)"
                    value={formatINR(selectedSong.lifetimeArtistPaise)}
                    hint={`${formatNumber(selectedSong.lifetimeStreams)} streams · gross ${formatINR(selectedSong.lifetimeGrossPaise)}`}
                    accent="success"
                  />
                  <StatCard
                    label="Catalogue streams"
                    value={formatNumber(selectedSong.catalogueStreams)}
                    hint={`Catalogue gross ${formatINR(selectedSong.catalogueEarnings)}`}
                    accent="info"
                  />
                </div>
              </div>
            ) : (
              <Card>
                <CardBody>
                  <p className="text-sm text-ink-muted">Select a song to see monthly and lifetime earnings.</p>
                </CardBody>
              </Card>
            )}
          </div>
        </section>
      ) : null}
    </AuthGate>
  );
}
