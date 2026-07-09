"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && j?.data && !j.data.initialized) router.replace("/setup");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4" id="main">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4" id="main">
      <h1 className="text-xl font-semibold tracking-tight">Pensieve</h1>
      <p className="mt-1 text-sm text-zinc-500">Unlock with your password to view your files.</p>
      <div className="mt-6 rounded-lg border border-zinc-200 p-5">
        <LoginForm />
      </div>
    </main>
  );
}
