export type ArchiveEntry = {
  name: string;
  size: number;
  isDir: boolean;
  /** Byte offset of file data inside the container, when extractable. */
  dataOffset?: number;
  compression?: "store" | "deflate";
  compressedSize?: number;
};

const ZIP_EOCD = 0x06054b50;
const ZIP_CENTRAL = 0x02014b50;
const TAR_BLOCK = 512;

function readAscii(bytes: Uint8Array, start: number, len: number): string {
  let out = "";
  const end = Math.min(bytes.length, start + len);
  for (let i = start; i < end; i++) {
    const c = bytes[i]!;
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  return out.trim();
}

function findEocd(view: DataView): number {
  const min = Math.max(0, view.byteLength - 22 - 65535);
  for (let i = view.byteLength - 22; i >= min; i--) {
    if (view.getUint32(i, true) === ZIP_EOCD) return i;
  }
  return -1;
}

function asBytes(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

export function listZip(buffer: ArrayBuffer | Uint8Array): ArchiveEntry[] {
  const bytes = asBytes(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEocd(view);
  if (eocd < 0) return [];
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries: ArchiveEntry[] = [];
  for (let i = 0; i < count && offset + 46 <= bytes.length; i++) {
    if (view.getUint32(offset, true) !== ZIP_CENTRAL) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOff = view.getUint32(offset + 42, true);
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLen);
    const name = new TextDecoder("utf-8").decode(nameBytes);
    let dataOffset = localOff + 30;
    if (localOff + 30 <= bytes.length) {
      const localName = view.getUint16(localOff + 26, true);
      const localExtra = view.getUint16(localOff + 28, true);
      dataOffset = localOff + 30 + localName + localExtra;
    }
    entries.push({
      name,
      size,
      isDir: name.endsWith("/"),
      dataOffset,
      compression: method === 8 ? "deflate" : "store",
      compressedSize,
    });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export async function extractZipEntry(
  buffer: ArrayBuffer | Uint8Array,
  entry: ArchiveEntry,
): Promise<Uint8Array> {
  const bytes = asBytes(buffer);
  const start = entry.dataOffset ?? 0;
  const packed = bytes.subarray(start, start + (entry.compressedSize ?? entry.size));
  if (entry.compression === "deflate") {
    if (typeof DecompressionStream !== "function") {
      throw new Error("deflate is not supported in this browser");
    }
    const stream = new Blob([packed.slice()]).stream().pipeThrough(
      new DecompressionStream("deflate-raw"),
    );
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return packed.slice();
}

export function listTar(buffer: ArrayBuffer | Uint8Array): ArchiveEntry[] {
  const bytes = asBytes(buffer);
  const entries: ArchiveEntry[] = [];
  let offset = 0;
  while (offset + TAR_BLOCK <= bytes.length) {
    if (bytes[offset] === 0) break;
    const name = readAscii(bytes, offset, 100);
    if (!name) break;
    const size = parseInt(readAscii(bytes, offset + 124, 12), 8) || 0;
    const typeflag = String.fromCharCode(bytes[offset + 156] || 0);
    const prefix = readAscii(bytes, offset + 345, 155);
    const full = prefix ? `${prefix}/${name}` : name;
    entries.push({
      name: full,
      size,
      isDir: typeflag === "5" || full.endsWith("/"),
      dataOffset: offset + TAR_BLOCK,
      compression: "store",
      compressedSize: size,
    });
    offset += TAR_BLOCK + Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
  }
  return entries;
}

export async function inflateGzip(buffer: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  const bytes = asBytes(buffer);
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return bytes.slice().buffer as ArrayBuffer;
  }
  if (typeof DecompressionStream !== "function") {
    throw new Error("gzip is not supported in this browser");
  }
  const stream = new Blob([bytes.slice()]).stream().pipeThrough(
    new DecompressionStream("gzip"),
  );
  return new Response(stream).arrayBuffer();
}

export async function listGzipTar(buffer: ArrayBuffer): Promise<ArchiveEntry[]> {
  const inner = await inflateGzip(buffer);
  return listTar(inner);
}

/** ISO 9660 root directory names (Joliet skipped; primary volume only). */
export function listIso(buffer: ArrayBuffer | Uint8Array): ArchiveEntry[] {
  const bytes = asBytes(buffer);
  const sector = 2048;
  const pvd = 16 * sector;
  if (pvd + 256 > bytes.length) return [];
  if (bytes[pvd] !== 1) return [];
  const id = readAscii(bytes, pvd + 1, 5);
  if (id !== "CD001") return [];
  const recLen = bytes[pvd + 156] ?? 0;
  if (recLen < 34) return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const extent = view.getUint32(pvd + 158, true);
  const dirSize = view.getUint32(pvd + 166, true);
  const start = extent * sector;
  const end = Math.min(bytes.length, start + dirSize);
  const entries: ArchiveEntry[] = [];
  let off = start;
  while (off + 33 < end) {
    const len = bytes[off] ?? 0;
    if (len === 0) {
      off = Math.ceil((off + 1) / sector) * sector;
      continue;
    }
    const nameLen = bytes[off + 32] ?? 0;
    const raw = readAscii(bytes, off + 33, nameLen);
    const size = view.getUint32(off + 10, true);
    const flags = bytes[off + 25] ?? 0;
    if (raw && raw !== "\u0000" && raw !== "\u0001") {
      const name = raw.split(";")[0] ?? raw;
      entries.push({ name, size, isDir: (flags & 2) !== 0 });
    }
    off += len;
  }
  return entries;
}

/** Debian .deb is an `ar` archive. */
export function listAr(buffer: ArrayBuffer | Uint8Array): ArchiveEntry[] {
  const bytes = asBytes(buffer);
  const magic = "!<arch>\n";
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic.charCodeAt(i)) return [];
  }
  const entries: ArchiveEntry[] = [];
  let offset = 8;
  while (offset + 60 <= bytes.length) {
    const name = readAscii(bytes, offset, 16).replace(/\/$/, "");
    const size = parseInt(readAscii(bytes, offset + 48, 10), 10) || 0;
    const dataOffset = offset + 60;
    entries.push({
      name: name || "member",
      size,
      isDir: false,
      dataOffset,
      compression: "store",
      compressedSize: size,
    });
    offset = dataOffset + size + (size % 2);
  }
  return entries;
}

export function rpmLeadName(buffer: ArrayBuffer | Uint8Array): string | null {
  const bytes = asBytes(buffer);
  if (bytes.length < 96) return null;
  if (bytes[0] !== 0xed || bytes[1] !== 0xab || bytes[2] !== 0xee || bytes[3] !== 0xdb) {
    return null;
  }
  return readAscii(bytes, 10, 66) || null;
}

export function hexPreview(buffer: ArrayBuffer | Uint8Array, maxBytes = 256): string {
  const bytes = asBytes(buffer);
  const n = Math.min(bytes.length, maxBytes);
  const lines: string[] = [];
  for (let i = 0; i < n; i += 16) {
    const slice = bytes.subarray(i, Math.min(i + 16, n));
    const hex = [...slice].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = [...slice]
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`${i.toString(16).padStart(8, "0")}  ${hex.padEnd(47, " ")}  ${ascii}`);
  }
  if (bytes.length > n) lines.push(`… ${bytes.length - n} more bytes`);
  return lines.join("\n");
}
