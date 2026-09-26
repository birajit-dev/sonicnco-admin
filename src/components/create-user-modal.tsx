"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { api } from "@/lib/api";

type Role = "artist" | "production_company" | "support" | "admin";

export function CreateUserModal({
  open,
  defaultRole,
  onClose,
  onCreated,
}: {
  open: boolean;
  defaultRole: Role;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>(defaultRole);
  const [plan, setPlan] = useState("freemium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ id: string }>("/admin/users", {
      method: "POST",
      body: {
        name: name.trim(),
        artistName: artistName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        role,
        plan,
      },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setName("");
    setArtistName("");
    setCompanyName("");
    setEmail("");
    setPassword("");
    setPhone("");
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-lg rounded-xl border border-line bg-surface p-5 shadow-card"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Add user</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Creates a verified account with the free plan so they can sign in
              immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Legal name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Artist / display name">
            <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} />
          </Field>
          <Field label="Email" required className="sm:col-span-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password" required>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="artist">Artist</option>
              <option value="production_company">Production company</option>
              <option value="support">Support</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Field label="Plan">
            <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="freemium">Free distribution</option>
              <option value="premium">Premium</option>
            </Select>
          </Field>
          {role === "production_company" ? (
            <Field label="Company name" className="sm:col-span-2">
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </Field>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Create account
          </Button>
        </div>
      </form>
    </div>
  );
}
