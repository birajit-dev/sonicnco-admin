"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Send, X } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

type ChecklistItem = {
  key: string;
  label: string;
  ok: boolean;
  blocking: boolean;
  detail?: string;
};

type StoreRow = {
  store: string;
  status: string;
  note: string | null;
  updatedAt: string | null;
};

type EventRow = {
  id: number;
  action: string;
  store: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: string;
};

type DistDetail = {
  release: {
    id: string;
    title: string;
    primaryArtist: string;
    artworkUrl: string | null;
    status: string;
    distributionStage?: string;
    genre: string;
    language: string;
    userName?: string;
    userEmail?: string;
  };
  stores: StoreRow[];
  events: EventRow[];
  checklist: ChecklistItem[];
  blockingFails: number;
  canSend: boolean;
  defaultStores: string[];
  distributionStage: string;
};

export default function DistributionSongPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<DistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [verified, setVerified] = useState(false);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failNote, setFailNote] = useState("");
  const [bulkStatus, setBulkStatus] = useState("live");

  const load = useCallback(async () => {
    const res = await api<DistDetail>(`/admin/distribution/releases/${id}`);
    if (!res.ok) {
      setError(res.error);
      setData(null);
      return;
    }
    setError(null);
    setData(res.data);
    const defaults = res.data.defaultStores ?? [];
    const existing = new Set((res.data.stores ?? []).map((s) => s.store));
    setSelectedStores(defaults.length ? defaults : Array.from(existing));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const allSelectedLive = useMemo(() => {
    if (!data?.stores.length) return false;
    return data.stores.every((s) => s.status === "live");
  }, [data]);

  async function send() {
    if (!data) return;
    if (!verified) {
      setError("Confirm you personally verified PDL metadata and audio before sending.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await api(`/admin/distribution/releases/${id}/send`, {
      method: "POST",
      body: {
        confirmTitle,
        stores: selectedStores,
        forceIncomplete: false,
      },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setConfirmTitle("");
    setVerified(false);
    await load();
  }

  async function setStore(store: string, status: string) {
    const note =
      status === "failed"
        ? failNote || window.prompt("Failure note (required):") || ""
        : "";
    if (status === "failed" && !note.trim()) {
      setError("A note is required when marking failed.");
      return;
    }
    setBusy(true);
    const res = await api(`/admin/releases/${id}/stores`, {
      method: "PATCH",
      body: { store, status, note },
    });
    setBusy(false);
    if (!res.ok) setError(res.error);
    else {
      setFailNote("");
      await load();
    }
  }

  async function bulkUpdate() {
    if (!data?.stores.length) return;
    const stores = data.stores.map((s) => s.store);
    const ok = window.confirm(
      `Update ${stores.length} store(s) on “${data.release.title}” to ${bulkStatus}?\n\nThis only affects THIS song.`,
    );
    if (!ok) return;
    setBusy(true);
    const res = await api(`/admin/distribution/releases/${id}/stores/bulk`, {
      method: "POST",
      body: {
        stores,
        status: bulkStatus,
        note: bulkStatus === "failed" ? failNote : "",
        confirmCount: stores.length,
      },
    });
    setBusy(false);
    if (!res.ok) setError(res.error);
    else await load();
  }

  function toggleStore(name: string) {
    setSelectedStores((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  }

  const tone = (s: string) => {
    if (s === "live") return "success" as const;
    if (s === "delivered") return "info" as const;
    if (s === "failed") return "danger" as const;
    return "warning" as const;
  };

  return (
    <AuthGate>
      <PageHeader
        title={data?.release.title ?? "Distribution cockpit"}
        description="One song at a time — checklist, confirmed send, per-store status, and audit trail."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/distribution" size="sm" variant="ghost">
              <ArrowLeft className="size-4" />
              Queues
            </ButtonLink>
            {data ? (
              <ButtonLink href={`/songs/${data.release.id}`} size="sm" variant="outline">
                Song details
              </ButtonLink>
            ) : null}
          </div>
        }
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      {data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="size-20 overflow-hidden rounded-lg border border-line bg-surface-2">
              {data.release.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.release.artworkUrl} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div>
              <p className="text-sm text-ink-muted">
                {data.release.primaryArtist}
                {data.release.userName ? ` · ${data.release.userName}` : ""}
                {data.release.userEmail ? ` · ${data.release.userEmail}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="brand">{data.distributionStage.replaceAll("_", " ")}</Badge>
                <Badge tone="neutral">{data.release.status.replaceAll("_", " ")}</Badge>
                <Badge tone="info">{data.release.language}</Badge>
                <Badge tone="neutral">{data.release.genre}</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pre-flight checklist</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {data.checklist.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start gap-3 rounded-lg border border-line px-3 py-2.5 text-sm"
                  >
                    <span
                      className={`mt-0.5 grid size-5 place-items-center rounded-full ${
                        item.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                      }`}
                    >
                      {item.ok ? <Check className="size-3" /> : <X className="size-3" />}
                    </span>
                    <div>
                      <p className="font-medium text-ink">
                        {item.label}
                        {item.blocking ? (
                          <span className="ml-2 text-[0.6875rem] text-ink-subtle">blocking</span>
                        ) : null}
                      </p>
                      {item.detail ? <p className="text-xs text-ink-muted">{item.detail}</p> : null}
                    </div>
                  </div>
                ))}
                {data.blockingFails > 0 ? (
                  <p className="text-sm text-danger">
                    {data.blockingFails} blocking item(s) — fix on the{" "}
                    <Link href={`/songs/${id}`} className="underline">
                      song details
                    </Link>{" "}
                    page before send.
                  </p>
                ) : (
                  <p className="text-sm text-success">Checklist clear — safe to send after title confirmation.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Send to distribution</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-ink-muted">Target stores</p>
                  <div className="flex flex-wrap gap-2">
                    {(data.defaultStores.length ? data.defaultStores : selectedStores).map((name) => (
                      <label
                        key={name}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                          selectedStores.includes(name)
                            ? "border-brand bg-brand-soft text-brand"
                            : "border-line text-ink-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selectedStores.includes(name)}
                          onChange={() => toggleStore(name)}
                        />
                        {name}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-line-strong"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                  />
                  <span>
                    I verified PDL metadata, artwork, WAV, and ISRC for this exact song. Mistakes here go live on DSPs.
                  </span>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-ink-muted">
                    Type the exact song title to confirm: <strong className="text-ink">{data.release.title}</strong>
                  </span>
                  <Input
                    value={confirmTitle}
                    onChange={(e) => setConfirmTitle(e.target.value)}
                    placeholder={data.release.title}
                    autoComplete="off"
                  />
                </label>
                <Button
                  type="button"
                  onClick={() => void send()}
                  disabled={busy || !data.canSend || selectedStores.length === 0}
                >
                  <Send className="size-4" />
                  Queue for DSP delivery
                </Button>
                {!data.canSend ? (
                  <p className="text-xs text-ink-subtle">
                    Song must be approved and pass blocking checks before send.
                  </p>
                ) : null}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>Store matrix (this song only)</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={failNote}
                  onChange={(e) => setFailNote(e.target.value)}
                  placeholder="Note for failures"
                  className="h-9 w-44"
                />
                <Select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="h-9">
                  <option value="pending">pending</option>
                  <option value="delivered">delivered</option>
                  <option value="live">live</option>
                  <option value="failed">failed</option>
                </Select>
                <Button type="button" size="sm" variant="secondary" disabled={busy || !data.stores.length} onClick={() => void bulkUpdate()}>
                  Apply to all stores on this song
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {data.stores.length === 0 ? (
                <p className="p-5 text-sm text-ink-muted">Not sent yet — use Send to distribution above.</p>
              ) : (
                <table className="min-w-full text-left text-[0.8125rem]">
                  <thead className="border-b border-line bg-surface-2 text-ink-muted">
                    <tr>
                      <th className="px-5 py-3 font-medium">Store</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Note</th>
                      <th className="px-5 py-3 font-medium">Updated</th>
                      <th className="px-5 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.stores.map((s) => (
                      <tr key={s.store}>
                        <td className="px-5 py-3 font-medium">{s.store}</td>
                        <td className="px-5 py-3">
                          <Badge tone={tone(s.status)}>
                            <Dot tone={tone(s.status)} />
                            {s.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-ink-muted">{s.note || "—"}</td>
                        <td className="px-5 py-3 text-ink-subtle">
                          {s.updatedAt ? formatDate(s.updatedAt) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Select
                            value={s.status}
                            className="h-9 min-w-28"
                            disabled={busy}
                            onChange={(e) => void setStore(s.store, e.target.value)}
                          >
                            <option value="pending">pending</option>
                            <option value="delivered">delivered</option>
                            <option value="live">live</option>
                            <option value="failed">failed</option>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {allSelectedLive ? (
                <p className="border-t border-line px-5 py-3 text-sm text-success">
                  All target stores are live for this song.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {data.events.length === 0 ? (
                <p className="p-5 text-sm text-ink-muted">No distribution events yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.events.map((ev) => (
                    <li key={ev.id} className="px-5 py-3 text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-ink">
                          {ev.action}
                          {ev.store ? ` · ${ev.store}` : ""}
                        </span>
                        <span className="text-xs text-ink-subtle">{formatDate(ev.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {ev.fromStatus || "—"} → {ev.toStatus || "—"}
                        {ev.note ? ` · ${ev.note}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </AuthGate>
  );
}
