"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, FormMessage } from "@/components/ui/form";
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

const DOT_OPTIONS = [
  { value: "lime", label: "Lime" },
  { value: "violet", label: "Violet" },
  { value: "amber", label: "Amber" },
  { value: "sky", label: "Sky" },
  { value: "rose", label: "Rose" },
  { value: "cyan", label: "Cyan" },
];

export default function FeaturedArtistEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === "new";

  const [name, setName] = useState("");
  const [highlight, setHighlight] = useState("");
  const [genre, setGenre] = useState("");
  const [city, setCity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dotColor, setDotColor] = useState("lime");
  const [linkUrl, setLinkUrl] = useState("/signup");
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    void (async () => {
      const res = await api<FeaturedArtist>(`/admin/featured-artists/${params.id}`);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName(res.data.name);
      setHighlight(res.data.highlight);
      setGenre(res.data.genre);
      setCity(res.data.city);
      setImageUrl(res.data.imageUrl);
      setDotColor(res.data.dotColor);
      setLinkUrl(res.data.linkUrl);
      setSortOrder(res.data.sortOrder);
      setIsPublished(res.data.isPublished);
    })();
  }, [isNew, params.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name,
      highlight,
      genre,
      city,
      imageUrl,
      dotColor,
      linkUrl,
      sortOrder,
      isPublished,
    };
    const res = isNew
      ? await api<FeaturedArtist>("/admin/featured-artists", { method: "POST", body: payload })
      : await api<FeaturedArtist>(`/admin/featured-artists/${params.id}`, {
          method: "PUT",
          body: payload,
        });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace(`/featured-artists/${res.data.id}`);
  }

  return (
    <AuthGate>
      <PageHeader
        title={isNew ? "Add featured artist" : "Edit featured artist"}
        description="Portrait cards in the homepage artists wall carousel."
        breadcrumbs={[
          { label: "Homepage artists", href: "/featured-artists" },
          { label: isNew ? "New" : "Edit" },
        ]}
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          <CardBody className="grid gap-5">
            <Field label="Artist name" htmlFor="name" required>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Highlight line" htmlFor="highlight" hint="Coloured tagline under the name" required>
              <Input
                id="highlight"
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                required
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Genre" htmlFor="genre" required>
                <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} required />
              </Field>
              <Field label="City" htmlFor="city" required>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
              </Field>
            </div>
            <Field
              label="Portrait image URL"
              htmlFor="imageUrl"
              hint="Path like /images/artists/name.jpg or full CDN URL"
              required
            >
              <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Status dot colour" htmlFor="dotColor">
                <Select id="dotColor" value={dotColor} onChange={(e) => setDotColor(e.target.value)}>
                  {DOT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Card link" htmlFor="linkUrl" hint="Where clicking the card goes">
                <Input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Sort order" htmlFor="sortOrder" hint="Lower numbers appear first">
                <Input
                  id="sortOrder"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
              </Field>
              <Field label="Visibility" htmlFor="isPublished">
                <Select
                  id="isPublished"
                  value={isPublished ? "published" : "hidden"}
                  onChange={(e) => setIsPublished(e.target.value === "published")}
                >
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create artist" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/featured-artists")}>
            Cancel
          </Button>
        </div>
      </form>
    </AuthGate>
  );
}
