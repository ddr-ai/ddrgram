import type { FileItem, FileKind } from "@/telegram/types";
import { classifyFile, extensionOf } from "./fileTypes";

export type PreviewMode = "image" | "pdf" | "text" | "list" | "binary";

export function previewMode(file: Pick<FileItem, "kind" | "ext" | "mime" | "name">): PreviewMode {
  if (file.kind === "folder") return "list";
  if (file.kind === "image") return "image";
  const ext = file.ext || extensionOf(file.name);
  const mime = file.mime.toLowerCase();
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (file.kind === "archive" || file.kind === "package" || ext === "epub") return "list";
  if (file.kind === "document" || file.kind === "code" || file.kind === "ebook") return "text";
  return "binary";
}

export function kindFromName(name: string, mime = ""): FileKind {
  return classifyFile(name, mime) ?? "document";
}

export const TEXT_LIMIT = 1_500_000;

export function decodeText(bytes: Uint8Array): string {
  const slice = bytes.byteLength > TEXT_LIMIT ? bytes.subarray(0, TEXT_LIMIT) : bytes;
  const text = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  return bytes.byteLength > TEXT_LIMIT
    ? `${text}\n\n… truncated after ${TEXT_LIMIT.toLocaleString()} bytes`
    : text;
}
