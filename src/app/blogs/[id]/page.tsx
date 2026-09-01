"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyMd: string;
  coverUrl: string | null;
  status: string;
};

export default function BlogEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === "new";

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    void (async () => {
      const res = await api<BlogPost>(`/admin/blogs/${params.id}`);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle(res.data.title);
      setSlug(res.data.slug);
      setExcerpt(res.data.excerpt ?? "");
      setBodyMd(res.data.bodyMd);
      setCoverUrl(res.data.coverUrl ?? "");
      setStatus(res.data.status);
    })();
  }, [isNew, params.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title,
      slug: slug || undefined,
      excerpt: excerpt || null,
      bodyMd,
      coverUrl: coverUrl || null,
      status,
    };
    const res = isNew
      ? await api<BlogPost>("/admin/blogs", { method: "POST", body: payload })
      : await api<BlogPost>(`/admin/blogs/${params.id}`, { method: "PUT", body: payload });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace(`/blogs/${res.data.id}`);
  }

  return (
    <AuthGate>
      <PageHeader
        title={isNew ? "New blog post" : "Edit blog post"}
        description="Markdown body is supported. Publish when ready for the website."
        breadcrumbs={[
          { label: "Blog posts", href: "/blogs" },
          { label: isNew ? "New" : "Edit" },
        ]}
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          <CardBody className="grid gap-5">
            <Field label="Title" htmlFor="title" required>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Slug" htmlFor="slug" hint="Leave blank to auto-generate from title">
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </Field>
              <Field label="Status" htmlFor="status">
                <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>
            </div>
            <Field label="Excerpt" htmlFor="excerpt">
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="min-h-20"
              />
            </Field>
            <Field label="Cover image URL" htmlFor="cover">
              <Input id="cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
            </Field>
            <Field label="Body (Markdown)" htmlFor="body" required>
              <Textarea
                id="body"
                value={bodyMd}
                onChange={(e) => setBodyMd(e.target.value)}
                className="min-h-64 font-mono text-[0.8125rem]"
                required
              />
            </Field>
          </CardBody>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.push("/blogs")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create post" : "Save changes"}
          </Button>
        </div>
      </form>
    </AuthGate>
  );
}
