import { ChevronLeft, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { extractZipEntry, hexPreview, type ArchiveEntry } from "@/files/archiveList";
import { classifyFile, extensionOf } from "@/files/fileTypes";
import { listContents, type ListedContents } from "@/files/listContents";
import { decodeText, previewMode } from "@/files/previewMode";
import { errorMessage } from "@/telegram/errors";
import type { TelegramPort } from "@/telegram/port";
import type { FileItem } from "@/telegram/types";

type Layer =
  | { key: string; source: "remote"; file: FileItem }
  | { key: string; source: "local"; name: string; ext: string; mime: string; bytes: Uint8Array };

export function FilePreview({
  file,
  port,
  onClose,
  saveFile,
}: {
  file: FileItem;
  port: TelegramPort | null;
  onClose: () => void;
  saveFile: (blob: Blob, filename: string) => void;
}) {
  const [stack, setStack] = useState<Layer[]>(() => [
    { key: `remote:${file.msgId}`, source: "remote", file },
  ]);
  const current = stack[stack.length - 1]!;
  const [blob, setBlob] = useState<Blob | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cache = useMemo(() => new Map<number, Blob>(), []);

  const identity = useMemo(
    () =>
      current.source === "remote"
        ? current.file
        : {
            kind: classifyFile(current.name, current.mime) ?? "document",
            ext: current.ext,
            mime: current.mime,
            name: current.name,
          },
    [current],
  );
  const mode = previewMode(identity);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      setProgress(0);
      if (current.source === "local") {
        const copy = current.bytes.slice();
        const localBlob = new Blob([copy], {
          type: current.mime || "application/octet-stream",
        });
        setBlob(localBlob);
        setBuffer(copy);
        setBusy(false);
        return;
      }
      if (current.file.kind === "folder") {
        setBlob(null);
        setBuffer(null);
        setBusy(false);
        return;
      }
      if (!port) return;
      setBusy(true);
      try {
        let next = cache.get(current.file.msgId) ?? null;
        if (!next) {
          next = await port.downloadFile(current.file.media, (ratio) => {
            if (!cancelled) setProgress(ratio);
          });
          cache.set(current.file.msgId, next);
        }
        if (cancelled || !next) return;
        setBlob(next);
        setBuffer(new Uint8Array(await next.arrayBuffer()));
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [current, port, cache]);

  const objectUrl = useMemo(() => {
    if (mode !== "image" && mode !== "pdf") return null;
    if (mode === "pdf" && buffer) {
      const copy = new Uint8Array(buffer.byteLength);
      copy.set(buffer);
      return URL.createObjectURL(new Blob([copy], { type: "application/pdf" }));
    }
    if (mode === "image" && blob) return URL.createObjectURL(blob);
    return null;
  }, [blob, buffer, mode]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const [listing, setListing] = useState<ListedContents | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (mode !== "list" || !buffer) {
        setListing(null);
        return;
      }
      if (current.source === "remote" && current.file.kind === "folder") return;
      const result = await listContents(buffer, identity);
      if (!cancelled) setListing(result);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [buffer, mode, current, identity]);

  const title = current.source === "remote" ? current.file.name : current.name;

  function back() {
    if (stack.length > 1) setStack((s) => s.slice(0, -1));
    else onClose();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (stack.length > 1) setStack((s) => s.slice(0, -1));
      else onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stack.length, onClose]);

  function save() {
    if (current.source === "local") {
      saveFile(
        new Blob([current.bytes.slice()], {
          type: current.mime || "application/octet-stream",
        }),
        current.name,
      );
      return;
    }
    if (blob) saveFile(blob, current.file.name);
  }

  async function openEntry(entry: ArchiveEntry) {
    const source = listing?.payload ?? buffer;
    if (entry.isDir || !source) return;
    const ext = extensionOf(entry.name);
    let bytes: Uint8Array;
    try {
      const zipLike = identity.ext === "zip" || identity.ext === "epub" || identity.kind === "ebook";
      if (zipLike || entry.compression === "deflate") {
        bytes = await extractZipEntry(source, entry);
      } else if (entry.dataOffset != null && entry.compressedSize != null) {
        bytes = new Uint8Array(source).subarray(
          entry.dataOffset,
          entry.dataOffset + entry.compressedSize,
        );
      } else {
        return;
      }
    } catch {
      setError("Could not extract that file.");
      return;
    }
    const mime = ext === "pdf" ? "application/pdf" : ext.match(/png|jpe?g|gif|webp/) ? `image/${ext}` : "application/octet-stream";
    setStack((s) => [
      ...s,
      {
        key: `local:${entry.name}:${s.length}`,
        source: "local",
        name: entry.name.split("/").pop() || entry.name,
        ext,
        mime,
        bytes,
      },
    ]);
  }

  const folderChildren =
    current.source === "remote" && current.file.kind === "folder" ? current.file.children ?? [] : [];

  const textBody =
    mode === "text" && buffer
      ? decodeText(buffer)
      : listing?.text ?? (mode === "binary" && buffer ? hexPreview(buffer) : null);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-bg"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <Button variant="ghost" aria-label="Back" onClick={back}>
          <ChevronLeft className="size-5" />
          Back
        </Button>
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        <Button
          size="sm"
          variant="secondary"
          aria-label={`Download ${title}`}
          disabled={!blob && current.source !== "local"}
          onClick={save}
        >
          <Download className="size-4" aria-hidden />
          Save
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6">
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {busy ? (
          <p className="text-sm text-muted tabular-nums">
            Loading {Math.round(progress * 100)}%
          </p>
        ) : null}
        {mode === "image" && objectUrl ? (
          <img
            src={objectUrl}
            alt={title}
            className="mx-auto max-h-full max-w-full rounded-xl object-contain shadow-[var(--shadow-raised)]"
          />
        ) : null}
        {mode === "pdf" && objectUrl ? (
          <iframe
            title={title}
            src={objectUrl}
            className="size-full min-h-[70dvh] rounded-xl bg-surface"
          />
        ) : null}
        {folderChildren.length > 0 ? (
          <EntryList
            names={folderChildren.map((c) => ({
              name: c.name,
              size: c.sizeBytes,
              isDir: c.kind === "folder",
              onOpen: () =>
                setStack((s) => [...s, { key: `remote:${c.msgId}`, source: "remote", file: c }]),
            }))}
          />
        ) : null}
        {listing?.note ? <p className="mb-3 text-sm text-muted text-pretty">{listing.note}</p> : null}
        {listing && listing.entries.length > 0 ? (
          <EntryList
            names={listing.entries.map((entry) => ({
              name: entry.name,
              size: entry.size,
              isDir: entry.isDir,
              onOpen: entry.isDir ? undefined : () => void openEntry(entry),
            }))}
          />
        ) : null}
        {textBody ? (
          <pre className="file-preview-pre whitespace-pre-wrap break-words rounded-xl bg-surface-2 p-4 text-sm text-fg">
            {textBody}
          </pre>
        ) : null}
        {!busy && !error && mode === "pdf" ? (
          <p className="mt-3 text-xs text-muted">
            If the PDF is blank, use Save and open it from Downloads.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function EntryList({
  names,
}: {
  names: Array<{ name: string; size: number; isDir: boolean; onOpen?: () => void }>;
}) {
  return (
    <ul className="mb-4 flex flex-col gap-2">
      {names.map((entry) => (
        <li key={entry.name}>
          {entry.onOpen ? (
            <button
              type="button"
              className="raised-card flex min-h-11 w-full items-center justify-between rounded-xl bg-surface px-3 py-2 text-left"
              onClick={entry.onOpen}
            >
              <span className="truncate font-medium">{entry.name}</span>
              <span className="shrink-0 text-xs text-muted">{entry.isDir ? "folder" : ""}</span>
            </button>
          ) : (
            <div className="flex min-h-11 items-center justify-between rounded-xl bg-surface px-3 py-2">
              <span className="truncate text-sm">{entry.name}</span>
              <span className="text-xs text-muted">{entry.isDir ? "folder" : ""}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
