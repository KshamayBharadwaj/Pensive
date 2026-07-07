"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput } from "@/components/ui/primitives";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message ?? "Request failed. Please try again.");
  }
  return json.data;
}

export function SetupForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/auth/setup", { password, confirmPassword: confirm });
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Create vault">
      <Field label="Password">
        <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm password">
        <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      </Field>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating vault…" : "Create Vault"}
      </Button>
    </form>
  );
}
