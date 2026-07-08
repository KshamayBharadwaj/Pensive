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

function SideBtn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`block w-full rounded-md px-2 py-1.5 text-left hover:bg-zinc-100 ${active ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"}`}>
      {children}
    </button>
  );
}

function MenuNavBtn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`block w-full rounded-md px-2 py-2 text-left hover:bg-zinc-100 ${active ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"}`}>
      {children}
    </button>
  );
}

function FolderItem({ folder, all, depth, activeId, trail, onOpen }: {
  folder: FolderRow;
  all: FolderRow[];
  depth: number;
  activeId: string | null;
  trail: { id: string; name: string }[];
  onOpen: (f: FolderRow, trail: { id: string; name: string }[]) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const children = all.filter((f) => f.parent_folder_id === folder.id);
  return (
    <li>
      <div className={`flex items-center rounded-md hover:bg-zinc-100 ${activeId === folder.id ? "bg-zinc-100" : ""}`} style={{ paddingLeft: `${depth * 12}px` }}>
        {children.length > 0 ? (
          <button onClick={() => setExpanded((e) => !e)} aria-label={expanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
            aria-expanded={expanded} className="rounded px-1.5 py-2 text-zinc-500">
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-[26px] shrink-0" aria-hidden="true" />
        )}
        <button onClick={() => onOpen(folder, trail)}
          className={`min-w-0 flex-1 truncate px-1 py-2 text-left ${activeId === folder.id ? "font-semibold text-zinc-900" : "text-zinc-700"}`}>
          <span className="mr-1" aria-hidden="true">📁</span>{folder.name}{folder.is_favorite ? " ★" : ""}
        </button>
      </div>
      {expanded ? children.map((c) => (
        <ul key={c.id}>
          <FolderItem folder={c} all={all} depth={depth + 1} activeId={activeId}
            trail={[...trail, { id: c.id, name: c.name }]} onOpen={onOpen} />
        </ul>
      )) : null}
    </li>
  );
}

function iconFor(mime: string | null): string {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "🖼️";
  if (m.startsWith("video/")) return "🎬";
  if (m.startsWith("audio/")) return "🎵";
  if (m.includes("pdf")) return "📕";
  if (m.includes("zip") || m.includes("archive")) return "📦";
  if (m.includes("sheet") || m.includes("excel") || m.includes("csv")) return "📊";
  if (m.includes("presentation")) return "📽️";
  if (m.includes("word") || m.includes("document")) return "📝";
  return "📄";
}
