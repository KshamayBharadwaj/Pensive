export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const v = bytes / Math.pow(k, i);
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${sizes[i]}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export type FileCategory =
  | "documents"
  | "images"
  | "videos"
  | "audio"
  | "archives"
  | "code"
  | "other";

export function categorize(mime: string | null | undefined, name: string): FileCategory {
  const m = (mime ?? "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (m.startsWith("image/")) return "images";
  if (m.startsWith("video/")) return "videos";
  if (m.startsWith("audio/")) return "audio";
  if (
    m.includes("zip") || m.includes("tar") || m.includes("rar") ||
    m.includes("7z") || m.includes("gzip") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  ) return "archives";
  if (
    m.startsWith("text/") || m.includes("pdf") || m.includes("document") ||
    m.includes("sheet") || m.includes("presentation") ||
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv"].includes(ext)
  ) return "documents";
  if (
    ["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "go", "rs", "json", "html", "css", "sql", "sh"].includes(ext)
  ) return "code";
  return "other";
}
