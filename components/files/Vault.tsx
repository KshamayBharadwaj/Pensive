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

function RowMenu(props: {
  starred: boolean;
  downloadHref?: string;
  onOpen?: () => void;
  onFav: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onDetails?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Close the menu on scroll/resize so the fixed position never goes stale
  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); setPos(null); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open ]);

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    if (open) {
      setOpen(false);
      setPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - 160, window.innerWidth - 168)),
    });
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setPos(null);
  }

  return (
    <span className="inline-block text-left">
      <button onClick={toggle} aria-label="File actions" aria-expanded={open}
        className="rounded border border-zinc-200 px-2 py-1 text-zinc-600 hover:bg-zinc-100">⋯</button>
      {open && pos ? (
        <>
          <span className="fixed inset-0 z-30" onClick={close} />
          <span
            className="fixed z-40 w-40 rounded-md border border-zinc-200 bg-white py-1 text-sm"
            style={{ top: pos.top, left: pos.left }}
            role="menu"
          >
            {props.onOpen ? <MenuItem onClick={() => { close(); props.onOpen!(); }}>Open</MenuItem> : null}
            {props.downloadHref ? <a href={props.downloadHref} className="block px-3 py-1.5 hover:bg-zinc-100" onClick={close} role="menuitem">Download</a> : null}
            {props.onDetails ? <MenuItem onClick={() => { close(); props.onDetails!(); }}>Details</MenuItem> : null}
            <MenuItem onClick={() => { close(); props.onFav(); }}>{props.starred ? "★ Unfavorite" : "☆ Favorite"}</MenuItem>
            <MenuItem onClick={() => { close(); props.onRename(); }}>Rename</MenuItem>
            <MenuItem onClick={() => { close(); props.onMove(); }}>Move</MenuItem>
            <MenuItem onClick={() => { close(); props.onDelete(); }}>Delete</MenuItem>
          </span>
        </>
      ) : null}
    </span>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="block w-full px-3 py-1.5 text-left hover:bg-zinc-100">{children}</button>;
}

function NewFolderDialog({ parentId, onClose, onCreated }: { parentId: string | null; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), parentFolderId: parentId }),
      });
      onClose();
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal title="New folder" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <TextInput aria-label="Folder name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Folder name" required autoFocus />
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function RenameDialog({ target, onClose, onDone }: { target: { kind: "file" | "folder"; id: string; name: string }; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(target.name);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = target.kind === "file" ? `/api/files/${target.id}/rename` : `/api/folders/${target.id}/rename`;
      await api(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal title={`Rename ${target.kind}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <TextInput aria-label="New name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Renaming…" : "Rename"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function MoveDialog({ target, folders, currentFolderId, onClose, onDone }: {
  target: { kind: "file" | "folder"; id: string; name: string };
  folders: FolderRow[];
  currentFolderId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [dest, setDest] = useState<string | "">("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selected: string | null = !touched ? (currentFolderId ?? "") : dest === "" && touched ? "" : dest || null;
  void selected;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const folderId = dest === "__root__" ? null : dest === "" ? null : dest;
      const url = target.kind === "file" ? `/api/files/${target.id}/move` : `/api/folders/${target.id}/move`;
      const body = target.kind === "file" ? { folderId } : { parentFolderId: folderId };
      await api(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const options = folders.filter((f) => f.id !== target.id);
  return (
    <Modal title={`Move ${target.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Destination folder</span>
          <select aria-label="Destination folder" value={dest} onChange={(e) => { setDest(e.target.value); setTouched(true); }}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            <option value="__root__">Root (no folder)</option>
            {options.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading || !touched}>{loading ? "Moving…" : "Move"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function FileDetails({ file, onClose, onFav, onRename, onMove, onDelete }: {
  file: FileRow;
  onClose: () => void;
  onFav: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal title="File details" onClose={onClose}>
      <h3 className="break-all text-base font-semibold">{file.name}</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-zinc-500">Type</dt><dd>{friendlyType(file.mime_type, file.name)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-zinc-500">Size</dt><dd>{formatBytes(file.size)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-zinc-500">Created</dt><dd>{formatDateTime(file.google_created_at ?? file.created_at)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-zinc-500">Modified</dt><dd>{formatDateTime(file.google_modified_at ?? file.updated_at)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-zinc-500">Favorite</dt><dd>{file.is_favorite ? "Yes ★" : "No"}</dd></div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <a href={`/api/files/${file.id}/download`} className="inline-flex items-center rounded-md border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-medium text-white">Download</a>
        <Button variant="secondary" onClick={onFav}>{file.is_favorite ? "Unfavorite" : "Favorite"}</Button>
        <Button variant="secondary" onClick={onRename}>Rename</Button>
        <Button variant="secondary" onClick={onMove}>Move</Button>
        <Button variant="danger" onClick={onDelete}>Delete</Button>
      </div>
    </Modal>
  );
}
