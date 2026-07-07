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
