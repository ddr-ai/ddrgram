import type { FileItem } from "@/telegram/types";
import {
  extractZipEntry,
  hexPreview,
  inflateGzip,
  listAr,
  listIso,
  listTar,
  listZip,
  rpmLeadName,
  type ArchiveEntry,
} from "./archiveList";
import { extensionOf } from "./fileTypes";

export type ListedContents = {
  entries: ArchiveEntry[];
  note?: string;
  text?: string;
  payload?: ArrayBuffer | Uint8Array;
};

function extOf(file: Pick<FileItem, "ext" | "name">): string {
  return file.ext || extensionOf(file.name);
}

export async function listContents(
  buffer: ArrayBuffer | Uint8Array,
  file: Pick<FileItem, "kind" | "ext" | "name">,
): Promise<ListedContents> {
  const ext = extOf(file);
  if (ext === "zip" || ext === "epub" || file.kind === "ebook") {
    const entries = listZip(buffer);
    if (ext === "epub") {
      const text = await epubText(buffer, entries);
      if (text) {
        return {
          entries,
          payload: buffer,
          text,
          note: "Chapters extracted from this EPUB.",
        };
      }
    }
    return {
      entries,
      payload: buffer,
      note: entries.length ? undefined : "Could not read this zip archive.",
    };
  }
  if (ext === "tar") return { entries: listTar(buffer), payload: buffer };
  if (ext === "gz" || ext === "tgz") {
    try {
      const inner = await inflateGzip(buffer);
      return { entries: listTar(inner), payload: inner };
    } catch {
      return { entries: [], note: "Could not decompress this gzip archive." };
    }
  }
  if (ext === "iso") {
    const entries = listIso(buffer);
    return {
      entries,
      note: entries.length ? "ISO 9660 root directory." : "Could not read this ISO image.",
      text: entries.length ? undefined : hexPreview(buffer),
    };
  }
  if (ext === "deb") {
    const entries = listAr(buffer);
    return {
      entries,
      payload: buffer,
      note: entries.length ? "Debian package members." : undefined,
    };
  }
  if (ext === "rpm") {
    const name = rpmLeadName(buffer);
    return {
      entries: name ? [{ name: `${name}.rpm`, size: buffer.byteLength, isDir: false }] : [],
      note: name ? `RPM package “${name}”. Payload is compressed; save the file to install.` : "Not a valid RPM lead.",
      text: hexPreview(buffer),
    };
  }
  return { entries: [], text: hexPreview(buffer) };
}

async function epubText(
  buffer: ArrayBuffer | Uint8Array,
  entries: ArchiveEntry[],
): Promise<string | null> {
  const container = entries.find((e) => /meta-inf\/container\.xml$/i.test(e.name));
  if (!container) return null;
  try {
    const xmlBytes = await extractZipEntry(buffer, container);
    const xml = new TextDecoder().decode(xmlBytes);
    const path = /full-path="([^"]+)"/i.exec(xml)?.[1];
    if (!path) return null;
    const opf = entries.find((e) => e.name.replace(/\\/g, "/") === path);
    if (!opf) return null;
    const opfText = new TextDecoder().decode(await extractZipEntry(buffer, opf));
    const hrefs = [...opfText.matchAll(/href="([^"]+\.x?html?)"/gi)].map((m) => m[1]!);
    const base = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
    const chunks: string[] = [];
    for (const href of hrefs.slice(0, 8)) {
      const full = href.startsWith("/") ? href.slice(1) : base + href;
      const entry = entries.find((e) => e.name.replace(/\\/g, "/") === full);
      if (!entry) continue;
      const html = new TextDecoder().decode(await extractZipEntry(buffer, entry));
      const text = html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
      if (text) chunks.push(text);
    }
    return chunks.length ? chunks.join("\n\n") : null;
  } catch {
    return null;
  }
}
