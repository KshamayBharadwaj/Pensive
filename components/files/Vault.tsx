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

export default function Vault() {
  const router = useRouter();
  const [view, setView] = useState<VaultView>("all");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<{ id: string; name: string }[]>([]);
  const [listing, setListing] = useState<Listing>({ folders: [], files: [], total: 0 });
  const [allFolders, setAllFolders] = useState<FolderRow[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [sort, setSort] = useState<SortKey>("modified");
  const [order, setOrder] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<FileFilter>("all");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ name: string; size: number }[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // dialogs
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailFile, setDetailFile] = useState<FileRow | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ kind: "file" | "folder"; id: string; name: string } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ kind: "file" | "folder"; id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "file" | "folder"; id: string; name: string } | null>(null);

  const needAuth = useCallback(
    (e: unknown) => {
      if ((e as { code?: string })?.code === "UNAUTHENTICATED") {
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (debouncedSearch.trim()) {
        const data = await api<{ files: FileRow[]; folders: FolderRow[] }>(
          `/api/search?q=${encodeURIComponent(debouncedSearch.trim())}`
        );
        setListing({ folders: data.folders, files: data.files, total: data.files.length });
      } else {
        const params = new URLSearchParams({
          view,
          sort,
          order,
          filter,
          page: "1",
          limit: "100",
        });
        if (view === "all" && folderId) params.set("folderId", folderId);
        const data = await api<Listing>(`/api/files?${params.toString()}`);
        setListing(data);
      }
      // folder tree for sidebar + move dialog
      const tree = await api<{ folders: FolderRow[] }>(`/api/folders`);
      setAllFolders(tree.folders);
    } catch (e) {
      if (needAuth(e)) return;
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [view, folderId, sort, order, filter, debouncedSearch, needAuth]);

  useEffect(() => {
    // session gate: uninitialized → setup
    fetch("/api/auth/session").then(async (r) => {
      const j = await r.json().catch(() => null);
      if (!j?.success || !j?.data?.initialized) router.replace("/setup");
      else if (!j?.data?.authenticated) router.replace("/login");
    }).catch(() => {});
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Hamburger drawer: lock body scroll + close on Escape
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    closeBtnRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function goView(v: VaultView) {
    setView(v);
    if (v !== "all") { setFolderId(null); setCrumbs([]); }
    setSearch("");
    setMenuOpen(false);
  }

  function goFolder(f: FolderRow, trail: { id: string; name: string }[]) {
    setView("all");
    setSearch("");
    setFolderId(f.id);
    setCrumbs(trail);
    setMenuOpen(false);
  }

  async function syncNow() {
    try {
      setNotice("Syncing…");
      await api("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: view === "all" ? folderId : null }),
      });
      await load();
      setNotice(null);
    } catch (e) {
      if (needAuth(e)) return;
      setNotice(null);
    }
  }

  function openFolder(f: FolderRow) {
    setView("all");
    setSearch("");
    setFolderId(f.id);
    setCrumbs((c) => [...c, { id: f.id, name: f.name }]);
  }

  function goCrumb(index: number) {
    // index -1 = root
    if (index === -1) {
      setFolderId(null);
      setCrumbs([]);
    } else {
      const next = crumbs.slice(0, index + 1);
      setCrumbs(next);
      setFolderId(next[next.length - 1].id);
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(arr.map((f) => ({ name: f.name, size: f.size })));
    setError(null);
    try {
      const form = new FormData();
      if (view === "all" && folderId) form.set("folderId", folderId);
      for (const f of arr) form.append("files", f);
      await api("/api/files/upload", { method: "POST", body: form });
      await load();
    } catch (e) {
      if (needAuth(e)) return;
      setError((e as Error).message);
    } finally {
      setUploading(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function toggleFav(kind: "file" | "folder", row: FileRow | FolderRow) {
    try {
      if (kind === "file") {
        await api(`/api/files/${row.id}/favorite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      } else {
        await api(`/api/folders/${row.id}/favorite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      }
      await load();
      if (detailFile && kind === "file" && detailFile.id === row.id) {
        setDetailFile({ ...(detailFile as FileRow), is_favorite: !(detailFile as FileRow).is_favorite });
      }
    } catch (e) {
      if (needAuth(e)) return;
      setError((e as Error).message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "file") {
        await api(`/api/files/${deleteTarget.id}/delete`, { method: "DELETE" });
      } else {
        await api(`/api/folders/${deleteTarget.id}/delete`, { method: "DELETE" });
      }
      setDeleteTarget(null);
      if (detailFile && detailFile.id === deleteTarget.id) setDetailFile(null);
      await load();
    } catch (e) {
      if (needAuth(e)) return;
      setError((e as Error).message);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const tree = useMemo(() => allFolders.filter((f) => !f.parent_folder_id), [allFolders]);

  const title = view === "all" ? (crumbs.length ? crumbs[crumbs.length - 1].name : "All Files") : view === "recent" ? "Recent" : "Favorites";

  return (
    <div
      className="min-h-screen"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
    >
      {/* Header */}
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:gap-3">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}
            className="rounded-md border border-zinc-300 px-2.5 py-2 text-sm leading-none hover:bg-zinc-50 sm:hidden">
            ☰
          </button>
          <span className="text-base font-semibold tracking-tight">Pensieve</span>
          <div className="order-3 w-full sm:order-none sm:mx-auto sm:w-auto sm:max-w-md sm:flex-1">
            <input
              aria-label="Search files"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <input ref={fileInput} type="file" multiple className="hidden" aria-hidden="true" tabIndex={-1}
            onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); }} />
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <Button onClick={() => fileInput.current?.click()} className="px-2 sm:px-3">+ Upload</Button>
            <a href="/settings" className="rounded-md border border-zinc-300 px-2 py-2 text-sm hover:bg-zinc-50 sm:px-3" aria-label="Settings">⚙<span className="hidden sm:inline"> Settings</span></a>
            <Button variant="ghost" onClick={logout} aria-label="Log out" className="px-2 sm:px-3">Logout</Button>
          </div>
        </div>
      </header>

      {dragOver ? (
        <div className="border-b border-zinc-900 bg-zinc-50 px-4 py-2 text-center text-sm" role="status">
          Drop files to upload{folderId && view === "all" ? " into this folder" : ""}.
        </div>
      ) : null}
      {uploading ? (
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2" role="status" aria-label="Uploading">
          <div className="mx-auto max-w-6xl text-sm">
            Uploading {uploading.length} file{uploading.length > 1 ? "s" : ""}…
            <span className="text-zinc-500"> {uploading.map((u) => u.name).slice(0, 3).join(", ")}{uploading.length > 3 ? "…" : ""}</span>
          </div>
          <div className="mx-auto mt-1 h-1 max-w-6xl overflow-hidden rounded bg-zinc-200">
            <div className="h-full w-2/3 animate-pulse bg-zinc-900" />
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-6xl flex-col px-0 sm:flex-row sm:gap-6 sm:px-4">
        {/* Sidebar (desktop) */}
        <nav aria-label="Library" className="hidden w-56 shrink-0 border-r border-zinc-200 py-4 pr-4 sm:block">
          <ul className="space-y-1 text-sm">
            <li><SideBtn active={view === "all" && !folderId} onClick={() => { setView("all"); setFolderId(null); setCrumbs([]); setSearch(""); }}>All Files</SideBtn></li>
            <li><SideBtn active={view === "recent"} onClick={() => { setView("recent"); setSearch(""); }}>Recent</SideBtn></li>
            <li><SideBtn active={view === "favorites"} onClick={() => { setView("favorites"); setSearch(""); }}>Favorites</SideBtn></li>
          </ul>
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Folders</h2>
            <button onClick={() => setShowNewFolder(true)} className="text-xs text-zinc-700 underline hover:text-zinc-900">+ New</button>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {tree.length === 0 ? <li className="text-zinc-400">No folders</li> : null}
            {tree.map((f) => (
              <li key={f.id}>
                <SideBtn active={folderId === f.id} onClick={() => { setView("all"); setSearch("");
                  const idx = crumbs.findIndex((c) => c.id === f.id);
                  if (idx >= 0) goCrumb(idx); else { setFolderId(f.id); setCrumbs([{ id: f.id, name: f.name }]); }
                }}>
                  <span className="mr-1" aria-hidden="true">📁</span>{f.name}{f.is_favorite ? " ★" : ""}
                </SideBtn>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main */}
        <main id="main" className="min-w-0 flex-1 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {view === "all" ? (
              <nav aria-label="Breadcrumb" className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-sm text-zinc-500">
                <button onClick={() => goCrumb(-1)} className={`hover:text-zinc-900 ${!folderId ? "font-semibold text-zinc-900" : ""}`}>All Files</button>
                {crumbs.map((c, i) => (
                  <span key={c.id}>
                    <span className="mx-1" aria-hidden="true">/</span>
                    <button onClick={() => goCrumb(i)} className={`hover:text-zinc-900 ${i === crumbs.length - 1 ? "font-semibold text-zinc-900" : ""}`}>{c.name}</button>
                  </span>
                ))}
              </nav>
            ) : (
              <h1 className="text-base font-semibold">{title}</h1>
            )}
            <div className="ml-auto flex items-center gap-2 text-sm">
              <button onClick={syncNow} className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50" title="Discover files added directly in Google Drive">Sync</button>
              <button onClick={() => setShowNewFolder(true)} className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50 sm:hidden">+ Folder</button>
            </div>
          </div>

          {/* Sort / filter */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1">Sort
              <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded border border-zinc-300 px-2 py-1">
                <option value="modified">Modified</option>
                <option value="name">Name</option>
                <option value="created">Created</option>
                <option value="size">Size</option>
                <option value="type">Type</option>
              </select>
            </label>
            <button aria-label="Toggle sort direction" onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))} className="rounded border border-zinc-300 px-2 py-1">
              {order === "asc" ? "↑" : "↓"}
            </button>
            <label className="flex items-center gap-1">Filter
              <select aria-label="Filter by type" value={filter} onChange={(e) => setFilter(e.target.value as FileFilter)} className="rounded border border-zinc-300 px-2 py-1">
                <option value="all">All</option>
                <option value="documents">Documents</option>
                <option value="images">Images</option>
                <option value="videos">Videos</option>
                <option value="audio">Audio</option>
                <option value="archives">Archives</option>
                <option value="code">Code</option>
                <option value="favorites">Favorites</option>
              </select>
            </label>
            {notice ? <span className="text-zinc-500" role="status">{notice}</span> : null}
          </div>

          {error ? <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p> : null}

          {loading ? (
            <p className="py-16 text-center text-sm text-zinc-500" role="status">Loading files…</p>
          ) : listing.folders.length === 0 && listing.files.length === 0 ? (
            debouncedSearch ? (
              <EmptyState title="No files found." body="Try another search term." />
            ) : view === "favorites" ? (
              <EmptyState title="No favorites yet." body="Star files and folders to find them quickly." />
            ) : (
              <EmptyState title="No files yet." body="Upload your first file to get started."
                action={<Button onClick={() => fileInput.current?.click()}>Upload File</Button>} />
            )
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="hidden px-4 py-2 font-medium sm:table-cell">Size</th>
                    <th className="hidden px-4 py-2 font-medium md:table-cell">Modified</th>
                    <th className="px-4 py-2 font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {listing.folders.map((f) => (
                    <tr key={`d-${f.id}`} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                      <td className="max-w-[220px] px-4 py-2 sm:max-w-none">
                        <button onClick={() => openFolder(f)} className="break-all text-left font-medium hover:underline" aria-label={`Open folder ${f.name}`}>
                          <span className="mr-2" aria-hidden="true">📁</span>{f.name}
                        </button>
                        {f.is_favorite ? <span className="ml-1 text-amber-500" aria-label="Favorite">★</span> : null}
                        <span className="block text-xs text-zinc-500 md:hidden">{formatDate(f.updated_at)}</span>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-2 text-zinc-500 sm:table-cell">—</td>
                      <td className="hidden whitespace-nowrap px-4 py-2 text-zinc-500 md:table-cell">{formatDate(f.updated_at)}</td>
                      <td className="px-4 py-2 text-right">
                        <RowMenu
                          starred={f.is_favorite}
                          onOpen={() => openFolder(f)}
                          onFav={() => toggleFav("folder", f)}
                          onRename={() => setRenameTarget({ kind: "folder", id: f.id, name: f.name })}
                          onMove={() => setMoveTarget({ kind: "folder", id: f.id, name: f.name })}
                          onDelete={() => setDeleteTarget({ kind: "folder", id: f.id, name: f.name })}
                        />
                      </td>
                    </tr>
                  ))}
                  {listing.files.map((f) => (
                    <tr key={f.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                      <td className="max-w-[220px] px-4 py-2 sm:max-w-none">
                        <button onClick={() => setDetailFile(f)} className="break-all text-left hover:underline" aria-label={`View details of ${f.name}`}>
                          <span className="mr-2" aria-hidden="true">{iconFor(f.mime_type)}</span>{f.name}
                        </button>
                        {f.is_favorite ? <span className="ml-1 text-amber-500" aria-label="Favorite">★</span> : null}
                        <span className="block text-xs text-zinc-500 sm:hidden">{formatBytes(f.size)} · {formatDate(f.google_modified_at ?? f.updated_at)}</span>
                        <span className="hidden text-xs text-zinc-500 md:hidden sm:block">{formatDate(f.google_modified_at ?? f.updated_at)}</span>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-2 text-zinc-500 sm:table-cell">{formatBytes(f.size)}</td>
                      <td className="hidden whitespace-nowrap px-4 py-2 text-zinc-500 md:table-cell">{formatDate(f.google_modified_at ?? f.updated_at)}</td>
                      <td className="px-4 py-2 text-right">
                        <RowMenu
                          starred={f.is_favorite}
                          downloadHref={`/api/files/${f.id}/download`}
                          onFav={() => toggleFav("file", f)}
                          onRename={() => setRenameTarget({ kind: "file", id: f.id, name: f.name })}
                          onMove={() => setMoveTarget({ kind: "file", id: f.id, name: f.name })}
                          onDelete={() => setDeleteTarget({ kind: "file", id: f.id, name: f.name })}
                          onDetails={() => setDetailFile(f)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Hamburger drawer (mobile) */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <span className="text-base font-semibold">Pensieve</span>
              <button ref={closeBtnRef} onClick={() => setMenuOpen(false)} aria-label="Close menu"
                className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100">✕</button>
            </div>
            <nav aria-label="Menu" className="flex-1 overflow-y-auto px-3 py-3 text-sm">
              <ul className="space-y-1">
                <li><MenuNavBtn active={view === "all" && !folderId} onClick={() => { goView("all"); setFolderId(null); setCrumbs([]); }}>All Files</MenuNavBtn></li>
                <li><MenuNavBtn active={view === "recent"} onClick={() => goView("recent")}>Recent</MenuNavBtn></li>
                <li><MenuNavBtn active={view === "favorites"} onClick={() => goView("favorites")}>Favorites</MenuNavBtn></li>
              </ul>
              <div className="mt-5 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Folders</h2>
                <button onClick={() => { setMenuOpen(false); setShowNewFolder(true); }} className="text-xs text-zinc-700 underline">+ New</button>
              </div>
              <ul className="mt-1 space-y-1">
                {allFolders.length === 0 ? <li className="px-1 text-zinc-400">No folders</li> : null}
                {tree.map((f) => (
                  <FolderItem key={f.id} folder={f} all={allFolders} depth={0}
                    activeId={folderId} trail={[{ id: f.id, name: f.name }]} onOpen={goFolder} />
                ))}
              </ul>
            </nav>
            <div className="border-t border-zinc-200 p-3 text-sm">
              <a href="/settings" className="block rounded-md px-2 py-2 hover:bg-zinc-100">⚙ Settings</a>
              <button onClick={logout} className="block w-full rounded-md px-2 py-2 text-left hover:bg-zinc-100">Logout</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Dialogs */}
      {showNewFolder ? (
        <NewFolderDialog
          parentId={view === "all" ? folderId : null}
          onClose={() => setShowNewFolder(false)}
          onCreated={load}
        />
      ) : null}
      {renameTarget ? (
        <RenameDialog
          target={renameTarget}
          onClose={() => setRenameTarget(null)}
          onDone={async () => { setRenameTarget(null); await load(); }}
        />
      ) : null}
      {moveTarget ? (
        <MoveDialog
          target={moveTarget}
          folders={allFolders}
          currentFolderId={folderId}
          onClose={() => setMoveTarget(null)}
          onDone={async () => { setMoveTarget(null); await load(); }}
        />
      ) : null}
      {deleteTarget ? (
        <Modal title={`Delete ${deleteTarget.kind}`} onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-zinc-600">
            Delete <strong>{deleteTarget.name}</strong>? It will be moved to Google Drive trash.
            {deleteTarget.kind === "folder" ? " Non-empty folders must be emptied first." : ""}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </div>
        </Modal>
      ) : null}
      {detailFile ? (
        <FileDetails
          file={detailFile}
          onClose={() => setDetailFile(null)}
          onFav={() => toggleFav("file", detailFile)}
          onRename={() => { setRenameTarget({ kind: "file", id: detailFile.id, name: detailFile.name }); }}
          onMove={() => { setMoveTarget({ kind: "file", id: detailFile.id, name: detailFile.name }); }}
          onDelete={() => { setDeleteTarget({ kind: "file", id: detailFile.id, name: detailFile.name }); }}
        />
      ) : null}
    </div>
  );
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
