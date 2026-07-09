"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput } from "@/components/ui/primitives";

export default function SettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function change(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword: confirm }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Unable to change password.");
      setMsg("Password changed. Please unlock again.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main id="main" className="mx-auto w-full max-w-lg px-4 py-10">
      <a href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Back to files</a>
      <h1 className="mt-2 text-xl font-semibold">Settings</h1>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5" aria-label="Change password">
        <h2 className="text-sm font-semibold">Change password</h2>
        <form onSubmit={change} className="mt-4 space-y-4">
          <Field label="Current password">
            <TextInput type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
          </Field>
          <Field label="New password (min 8 characters)">
            <TextInput type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password">
            <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          </Field>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          {msg ? <p className="text-sm text-green-700" role="status">{msg}</p> : null}
          <Button type="submit" disabled={loading}>{loading ? "Changing…" : "Change password"}</Button>
        </form>
      </section>

      <section className="mt-4 rounded-lg border border-zinc-200 p-5" aria-label="Session">
        <h2 className="text-sm font-semibold">Session</h2>
        <p className="mt-1 text-sm text-zinc-500">Lock Pensieve on this computer.</p>
        <div className="mt-3">
          <Button variant="secondary" onClick={logout}>Log out</Button>
        </div>
      </section>
    </main>
  );
}
