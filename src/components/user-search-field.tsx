"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Field, Input } from "@/components/ui/form";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export type UserSearchHit = {
  id: string;
  name: string;
  artistName: string;
  companyName?: string | null;
  email: string;
  accountType?: string;
};

export function UserSearchField({
  label = "User",
  hint = "Search by artist name, legal name, company, or email",
  value,
  onChange,
  required,
}: {
  label?: string;
  hint?: string;
  value: UserSearchHit | null;
  onChange: (user: UserSearchHit | null) => void;
  required?: boolean;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<UserSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      setBusy(false);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setBusy(true);
        setError(null);
        const params = new URLSearchParams({ q: query, limit: "12" });
        const res = await api<{ items: UserSearchHit[] }>(`/admin/users?${params}`);
        if (cancelled) return;
        setBusy(false);
        if (!res.ok) {
          setError(res.error);
          setHits([]);
          return;
        }
        setHits(res.data.items ?? []);
        setOpen(true);
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q]);

  if (value) {
    const display =
      value.companyName || value.artistName || value.name || value.email;
    return (
      <Field label={label} htmlFor={id} hint={hint} required={required}>
        <div className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface-2 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{display}</p>
            <p className="truncate text-xs text-ink-subtle">
              {value.email}
              {value.artistName && value.artistName !== display
                ? ` · ${value.artistName}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            className="inline-grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-surface-3 hover:text-ink"
            aria-label="Clear selected user"
            onClick={() => {
              onChange(null);
              setQ("");
              setHits([]);
            }}
          >
            <X className="size-4" />
          </button>
        </div>
      </Field>
    );
  }

  return (
    <Field label={label} htmlFor={id} hint={hint} required={required} error={error ?? undefined}>
      <div ref={rootRef} className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
          <Input
            id={id}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (hits.length) setOpen(true);
            }}
            placeholder="Type a name or email…"
            className="pl-9 pr-9"
            autoComplete="off"
            required={required}
          />
          {busy ? (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-subtle" />
          ) : null}
        </div>
        {open && q.trim().length >= 2 ? (
          <ul
            className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-canvas py-1 shadow-raised"
            role="listbox"
          >
            {hits.length === 0 && !busy ? (
              <li className="px-3 py-2.5 text-sm text-ink-subtle">No users found</li>
            ) : (
              hits.map((u) => {
                const primary = u.companyName || u.artistName || u.name;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      role="option"
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-surface-2",
                      )}
                      onClick={() => {
                        onChange(u);
                        setQ("");
                        setOpen(false);
                        setHits([]);
                      }}
                    >
                      <span className="text-sm font-medium text-ink">{primary}</span>
                      <span className="text-xs text-ink-subtle">
                        {u.email}
                        {u.name && u.name !== primary ? ` · ${u.name}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
