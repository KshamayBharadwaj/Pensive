"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SetupForm } from "@/components/auth/forms";

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [already, setAlready] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && j?.data?.initialized) setAlready(true);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (already) router.replace("/login");
  }, [already, router]);

  if (checking || already) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4" id="main">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4" id="main">
      <h1 className="text-xl font-semibold tracking-tight">Pensieve</h1>
      <p className="mt-1 text-sm text-zinc-500">Create a password to initialize your private vault.</p>
      <div className="mt-6 rounded-lg border border-zinc-200 p-5">
        <SetupForm />
      </div>
      <p className="mt-4 text-xs text-zinc-400">The password is hashed server-side. It is never stored in plain text.</p>
    </main>
  );
}
