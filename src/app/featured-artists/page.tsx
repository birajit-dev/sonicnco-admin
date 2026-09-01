"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Mic2, Plus } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";

type FeaturedArtist = {
  id: string;
  name: string;
  highlight: string;
  genre: string;
  city: string;
  imageUrl: string;
  dotColor: string;
  linkUrl: string;
  sortOrder: number;
  isPublished: boolean;
};

type SectionSettings = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  ctaText: string;
  ctaHref: string;
};

export default function FeaturedArtistsPage() {
  const [items, setItems] = useState<FeaturedArtist[]>([]);
  const [section, setSection] = useState<SectionSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionMsg, setSectionMsg] = useState<string | null>(null);

  async function load() {
    const res = await api<{ items: FeaturedArtist[]; section: SectionSettings }>(
      "/admin/featured-artists",
    );
    if (!res.ok) setError(res.error);
    else {
      setError(null);
      setItems(res.data.items);
      setSection(res.data.section);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    if (!window.confirm("Remove this artist from the homepage wall?")) return;
    const res = await api(`/admin/featured-artists/${id}`, { method: "DELETE" });
    if (!res.ok) setError(res.error);
    else void load();
  }

  async function move(index: number, direction: "up" | "down") {
    const next = [...items];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setItems(next);
    const res = await api<{ items: FeaturedArtist[] }>("/admin/featured-artists/reorder", {
      method: "PUT",
      body: { ids: next.map((a) => a.id) },
    });
    if (!res.ok) {
      setError(res.error);
      void load();
    } else {
      setItems(res.data.items);
    }
  }

  async function saveSection(e: FormEvent) {
    e.preventDefault();
    if (!section) return;
    setSectionSaving(true);
    setSectionMsg(null);
    const res = await api<SectionSettings>("/admin/featured-artists/section", {
      method: "PUT",
      body: section,
    });
    setSectionSaving(false);
    if (!res.ok) setSectionMsg(res.error);
    else {
      setSection(res.data);
      setSectionMsg("Section settings saved.");
    }
  }

  return (
    <AuthGate>
      <PageHeader
        title="Homepage artists wall"
        description="Manage the “Names already on the wall” carousel on the marketing homepage."
        actions={
          <ButtonLink href="/featured-artists/new" size="sm">
            <Plus className="size-4" />
            Add artist
          </ButtonLink>
        }
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      {section ? (
        <form onSubmit={saveSection} className="mb-6">
          <Card>
            <CardBody className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">Section header</h2>
                  <p className="mt-1 text-sm text-ink-subtle">
                    Eyebrow, title, and call-to-action shown above the carousel.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={(e) => setSection({ ...section, enabled: e.target.checked })}
                    className="size-4 rounded border-line"
                  />
                  Show on homepage
                </label>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Eyebrow" htmlFor="eyebrow">
                  <Input
                    id="eyebrow"
                    value={section.eyebrow}
                    onChange={(e) => setSection({ ...section, eyebrow: e.target.value })}
                  />
                </Field>
                <Field label="Title" htmlFor="title">
                  <Input
                    id="title"
                    value={section.title}
                    onChange={(e) => setSection({ ...section, title: e.target.value })}
                  />
                </Field>
                <Field label="CTA text" htmlFor="ctaText">
                  <Input
                    id="ctaText"
                    value={section.ctaText}
                    onChange={(e) => setSection({ ...section, ctaText: e.target.value })}
                  />
                </Field>
                <Field label="CTA link" htmlFor="ctaHref" hint="e.g. /signup">
                  <Input
                    id="ctaHref"
                    value={section.ctaHref}
                    onChange={(e) => setSection({ ...section, ctaHref: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" size="sm" disabled={sectionSaving}>
                  {sectionSaving ? "Saving…" : "Save section"}
                </Button>
                {sectionMsg ? (
                  <p className={`text-sm ${sectionMsg.includes("saved") ? "text-success" : "text-danger"}`}>
                    {sectionMsg}
                  </p>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </form>
      ) : null}

      {items.length === 0 && !error ? (
        <EmptyState
          icon={<Mic2 className="size-6" />}
          title="No featured artists yet"
          description="Add artists to populate the homepage carousel."
          action={
            <ButtonLink href="/featured-artists/new">
              <Plus className="size-4" />
              Add artist
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Artist</th>
                  <th className="px-5 py-3 font-medium">Highlight</th>
                  <th className="px-5 py-3 font-medium">Genre · City</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((artist, index) => (
                  <tr key={artist.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                          {artist.imageUrl ? (
                            <Image
                              src={artist.imageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized={artist.imageUrl.startsWith("http")}
                            />
                          ) : null}
                        </div>
                        <Link
                          href={`/featured-artists/${artist.id}`}
                          className="font-medium text-ink hover:text-brand"
                        >
                          {artist.name}
                        </Link>
                      </div>
                    </td>
                    <td className="max-w-[12rem] truncate px-5 py-3 text-ink-subtle">{artist.highlight}</td>
                    <td className="px-5 py-3 text-ink-subtle">
                      {artist.genre} · {artist.city}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={artist.isPublished ? "success" : "warning"}>
                        <Dot tone={artist.isPublished ? "success" : "warning"} />
                        {artist.isPublished ? "Published" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={index === 0}
                          onClick={() => void move(index, "up")}
                          aria-label="Move up"
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={index === items.length - 1}
                          onClick={() => void move(index, "down")}
                          aria-label="Move down"
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <ButtonLink href={`/featured-artists/${artist.id}`} size="sm" variant="outline">
                          Edit
                        </ButtonLink>
                        <Button size="sm" variant="danger" onClick={() => void remove(artist.id)}>
                          Delete
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
