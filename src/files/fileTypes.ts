import type { FileKind } from "@/telegram/types";

export type { FileKind };

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "bmp",
  "svg",
  "tif",
  "tiff",
  "avif",
  "ico",
]);
const DOC_EXT = new Set(["pdf", "txt", "md"]);
const CODE_EXT = new Set(["py", "js", "mjs", "cjs", "ts", "jsx", "tsx"]);
const EBOOK_EXT = new Set(["epub"]);
const ARCHIVE_EXT = new Set(["zip", "tar", "gz", "tgz", "bz2", "xz", "7z", "rar"]);
const PACKAGE_EXT = new Set(["iso", "deb", "rpm"]);

export function extensionOf(name: string): string {
  const base = name.trim().split(/[/\\]/).pop() ?? name;
  const i = base.lastIndexOf(".");
  if (i <= 0 || i === base.length - 1) return "";
  return base.slice(i + 1).toLowerCase();
}

export function classifyFile(name: string, mime = ""): FileKind | null {
  const ext = extensionOf(name);
  const m = mime.toLowerCase();
  if (m.startsWith("video/") || m.startsWith("audio/ogg") || m.startsWith("audio/mpeg")) {
    return null;
  }
  if (m.startsWith("image/") || IMAGE_EXT.has(ext)) return "image";
  if (ext === "pdf" || m === "application/pdf") return "document";
  if (DOC_EXT.has(ext) || m === "text/plain" || m.includes("markdown")) return "document";
  if (CODE_EXT.has(ext) || m.includes("javascript") || m.includes("python")) return "code";
  if (EBOOK_EXT.has(ext) || m.includes("epub")) return "ebook";
  if (PACKAGE_EXT.has(ext) || m.includes("iso9660") || m.includes("debian") || m.includes("x-rpm")) {
    return "package";
  }
  if (
    ARCHIVE_EXT.has(ext) ||
    m.includes("zip") ||
    m.includes("tar") ||
    m.includes("gzip") ||
    m.includes("x-rar") ||
    m.includes("x-7z")
  ) {
    return "archive";
  }
  return null;
}

export function safeDownloadName(name: string): string {
  const trimmed = name.trim() || "download";
  return trimmed.replace(/[/\\?%*:|"<>]/g, "_");
}
