"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Field, Input, FormMessage } from "@/components/ui/form";
import { Card, CardBody } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@sonicn.co");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await api<{ accessToken: string; role: string }>("/auth/admin/login", {
      method: "POST",
      body: { email, password },
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setToken(res.data.accessToken);
    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-raised">
        <CardBody className="p-8">
          <Logo className="mb-1" />
          <p className="mt-2 text-sm text-ink-muted">
            Admin console — sign in to continue
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            {error ? (
              <FormMessage tone="error">{error}</FormMessage>
            ) : null}

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
