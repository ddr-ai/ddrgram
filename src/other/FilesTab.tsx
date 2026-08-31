import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  Archive,
  BookOpen,
  Code,
  Download,
  FileText,
  Folder,
  Image as ImageIcon,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveBlobToDownloads } from "@/files/saveToDownloads";
import { formatBytes } from "@/lib/format";
import { listOtherlist } from "@/stores/otherStore";
import { AppError, errorMessage, parseTelegramError, userMessage } from "@/telegram/errors";
import { useTelegram } from "@/telegram/TelegramProvider";
import type { FileItem, FileKind, WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";
import { FilePreview } from "./FilePreview";

type ListState = {
  items: FileItem[];
  nextOffset: string | null;
  status: "idle" | "loading" | "empty" | "error";
};

function emptyList(): ListState {
  return { items: [], nextOffset: null, status: "idle" };
}

function reduceList(
  state: ListState,
  action:
    | { type: "reset" }
    | { type: "error" }
    | { type: "page"; files: FileItem[]; nextOffset: string | null },
): ListState {
  if (action.type === "reset") return { items: [], nextOffset: null, status: "loading" };
  if (action.type === "error") {
    return { ...state, status: state.items.length ? "idle" : "error" };
  }
  const seen = new Set(state.items.map((f) => `${f.kind}:${f.msgId}`));
  const merged = [
    ...state.items,
    ...action.files.filter((f) => !seen.has(`${f.kind}:${f.msgId}`)),
  ];
  return {
    items: merged,
    nextOffset: action.nextOffset,
    status: merged.length === 0 && !action.nextOffset ? "empty" : "idle",
  };
}

const KIND_ICON: Record<FileKind, typeof FileText> = {
  image: ImageIcon,
  document: FileText,
  code: Code,
  ebook: BookOpen,
  archive: Archive,
  package: Package,
  folder: Folder,
};

export function FilesTab({
  peerId,
  saveFile = saveBlobToDownloads,
}: {
  peerId: string;
  saveFile?: (blob: Blob, filename: string) => void;
}) {
  const { port } = useTelegram();
  const [peer, setPeer] = useState<WatchlistItem | null>(null);
  const [state, dispatch] = useReducer(reduceList, undefined, emptyList);
  const [error, setError] = useState<AppError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [preview, setPreview] = useState<FileItem | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    requestId.current += 1;
    dispatch({ type: "reset" });
    setError(null);
    setPeer(null);
    setPreview(null);
    void listOtherlist().then((list) => {
      if (cancelled) return;
      setPeer(list.find((x) => x.peerId === peerId) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [peerId]);

  const loadPage = useCallback(
    async (offset?: string) => {
      if (!port || !peer) return;
      const id = requestId.current;
      if (!offset) {
        dispatch({ type: "reset" });
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const page = await port.searchFiles(peer, offset);
        if (id !== requestId.current) return;
        dispatch({ type: "page", files: page.files, nextOffset: page.nextOffset });
      } catch (err) {
        if (id !== requestId.current) return;
        const parsed = parseTelegramError(err);
        if (!offset) {
          setError(parsed);
          dispatch({ type: "error" });
        } else {
          toast.error(userMessage(parsed));
        }
      } finally {
        if (id === requestId.current) setLoadingMore(false);
      }
    },
    [port, peer],
  );

  useEffect(() => {
    if (peer) void loadPage();
  }, [peer, loadPage]);

  useEffect(() => {
    const root = scroller.current;
    const el = sentinel.current;
    if (!root || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && state.nextOffset && !loadingMore) {
          void loadPage(state.nextOffset);
        }
      },
      { root, threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state.nextOffset, loadingMore, loadPage]);

  async function downloadOne(file: FileItem) {
    if (!port) return;
    setProgress((p) => ({ ...p, [file.msgId]: 0.02 }));
    try {
      const blob = await port.downloadFile(file.media, (ratio) => {
        setProgress((p) => ({ ...p, [file.msgId]: ratio }));
      });
      saveFile(blob, file.name);
      toast.success(`Saved ${file.name} to Downloads`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProgress((p) => {
        const next = { ...p };
        delete next[file.msgId];
        return next;
      });
    }
  }

  async function download(file: FileItem) {
    if (file.kind === "folder" && file.children?.length) {
      for (const child of file.children) {
        await downloadOne(child);
      }
      return;
    }
    await downloadOne(file);
  }

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={scroller}
        hidden={preview != null}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6"
      >
        <h1 className="mb-3 font-display text-lg font-semibold tracking-tight">
          {peer?.title ?? "Files"}
        </h1>
        <p className="mb-4 text-xs text-muted text-pretty">
          Tap a file to open it. Save puts a copy in this device’s Downloads folder.
        </p>
        {error?.code === "private_chat" ? (
          <p className="text-sm text-muted text-pretty">{userMessage(error)}</p>
        ) : null}
        {error && error.code !== "private_chat" && state.items.length === 0 ? (
          <div>
            <p className="text-sm text-danger text-pretty">{userMessage(error)}</p>
            <Button className="mt-3" variant="outline" onClick={() => void loadPage()}>
              Retry
            </Button>
          </div>
        ) : null}
        {state.status === "empty" ? (
          <p className="text-sm text-muted">No downloadable files in this channel/group.</p>
        ) : null}
        {state.status === "loading" ? (
          <p className="text-sm text-muted">Loading files…</p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {state.items.map((file) => {
            const Icon = KIND_ICON[file.kind];
            const busy = progress[file.msgId] != null;
            const label =
              file.kind === "folder"
                ? `Download ${file.children?.length ?? 0} files`
                : `Download ${file.name}`;
            const viewLabel =
              file.kind === "folder" ? `View ${file.name}` : `View ${file.name}`;
            return (
              <li
                key={`${file.kind}-${file.msgId}`}
                className="raised-card flex items-center gap-3 rounded-2xl bg-surface p-3"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-label={viewLabel}
                  onClick={() => setPreview(file)}
                >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span className="meta-chip capitalize">{file.kind}</span>
                    {file.ext ? <span className="meta-chip">.{file.ext}</span> : null}
                    {file.sizeBytes > 0 ? (
                      <span className="meta-chip tabular-nums">{formatBytes(file.sizeBytes)}</span>
                    ) : null}
                  </p>
                </div>
                </button>
                <Button
                  size="sm"
                  aria-label={label}
                  disabled={busy}
                  onClick={() => void download(file)}
                >
                  <Download className="size-4" aria-hidden />
                  {busy ? `${Math.round((progress[file.msgId] ?? 0) * 100)}%` : "Save"}
                </Button>
              </li>
            );
          })}
        </ul>
        <div ref={sentinel} className="h-8" />
        {loadingMore ? (
          <p className="py-2 text-center text-xs text-muted">Loading more…</p>
        ) : null}
      </div>
      {preview ? (
        <FilePreview
          file={preview}
          port={port}
          onClose={() => setPreview(null)}
          saveFile={saveFile}
        />
      ) : null}
    </div>
  );
}
