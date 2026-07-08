"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FileRow, FolderRow, SortDir, SortKey, FileFilter, VaultView } from "@/types";
import { formatBytes, formatDate, formatDateTime, friendlyType } from "@/lib/utils/format";
import { Button, EmptyState, Modal, TextInput } from "@/components/ui/primitives";

type Listing = { folders: FolderRow[]; files: FileRow[]; total: number };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => null);
  if (res.status === 401) {
    const e = new Error("UNAUTHENTICATED") as Error & { code?: string };
    e.code = "UNAUTHENTICATED";
    throw e;
  }
  if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Request failed. Please try again.");
  return json.data as T;
}

function useDebounced(value: string, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
