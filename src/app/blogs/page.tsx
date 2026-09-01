"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Newspaper, Plus } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
};

export default function BlogsPage() {
  const [items, setItems] = useState<BlogPost[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(next = status) {
    const q = next ? `?status=${encodeURIComponent(next)}` : "";
    const res = await api<{ items: BlogPost[]; total: number }>(`/admin/blogs${q}`);
    if (!res.ok) setError(res.error);
    else {
      setError(null);
      setItems(res.data.items);
    }
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(id: string) {
    if (!window.confirm("Delete this blog post?")) return;
    const res = await api(`/admin/blogs/${id}`, { method: "DELETE" });
    if (!res.ok) setError(res.error);
    else void load();
  }

  const tone = (s: string) =>
    s === "published" ? "success" : s === "archived" ? "neutral" : "warning";

  return (
    <AuthGate>
      <PageHeader
        title="Blog posts"
        description="Create and publish articles for the Sonic & Co website."
        actions={
          <>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                void load(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
            <ButtonLink href="/blogs/new" size="sm">
              <Plus className="size-4" />
              New post
            </ButtonLink>
          </>
        }
      />

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      {items.length === 0 && !error ? (
        <EmptyState
          icon={<Newspaper className="size-6" />}
          title="No blog posts yet"
          description="Write your first post for the marketing site."
          action={
            <ButtonLink href="/blogs/new">
              <Plus className="size-4" />
              New post
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Slug</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((post) => (
                  <tr key={post.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <Link href={`/blogs/${post.id}`} className="font-medium text-ink hover:text-brand">
                        {post.title}
                      </Link>
                      {post.excerpt ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-ink-subtle">{post.excerpt}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-muted">{post.slug}</td>
                    <td className="px-5 py-3">
                      <Badge tone={tone(post.status)}>
                        <Dot tone={tone(post.status)} />
                        {post.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-subtle">{formatDate(post.updatedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <ButtonLink href={`/blogs/${post.id}`} size="sm" variant="outline">
                          Edit
                        </ButtonLink>
                        <Button size="sm" variant="danger" onClick={() => void remove(post.id)}>
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
