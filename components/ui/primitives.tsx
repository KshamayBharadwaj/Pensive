"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
