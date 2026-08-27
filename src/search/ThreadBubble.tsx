import {
  Archive,
  BookOpen,
  Code,
  FileText,
  Folder,
  Image as ImageIcon,
  Package,
  Play,
} from "lucide-react";
import { formatBytes, formatClock, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMessage, FileItem, FileKind, VideoItem } from "@/telegram/types";

const KIND_ICON: Record<FileKind, typeof FileText> = {
  image: ImageIcon,
  document: FileText,
  code: Code,
  ebook: BookOpen,
  archive: Archive,
  package: Package,
  folder: Folder,
};

export function ThreadBubble({
  message,
  showSender,
  thumbs,
  onOpenFile,
  onOpenVideo,
}: {
  message: ChatMessage;
  showSender: boolean;
  thumbs: Record<string, string>;
  onOpenFile: (file: FileItem) => void;
  onOpenVideo: (video: VideoItem) => void;
}) {
  const mediaCount = message.photos.length + message.videos.length;
  return (
    <article
      className={cn("thread-row", message.outgoing && "thread-row-out")}
      data-msgid={message.msgId}
    >
      <div className={cn("thread-bubble", message.outgoing && "thread-bubble-out")}>
        {showSender ? <p className="thread-sender">{message.senderName}</p> : null}
        {mediaCount > 0 ? (
          <div
            className="thread-media"
            data-count={Math.min(mediaCount, 4)}
          >
            {message.photos.map((photo) => {
              const src = thumbs[`p:${photo.msgId}`];
              return (
                <button
                  key={`p-${photo.msgId}`}
                  type="button"
                  className="thread-media-btn"
                  aria-label={`View ${photo.name}`}
                  onClick={() => onOpenFile(photo)}
                >
                  {src ? (
                    <img src={src} alt="" />
                  ) : (
                    <span className="thread-media-fallback" />
                  )}
                </button>
              );
            })}
            {message.videos.map((video) => {
              const src = thumbs[`v:${video.msgId}`];
              return (
                <button
                  key={`v-${video.msgId}`}
                  type="button"
                  className="thread-media-btn"
                  aria-label="Play video"
                  onClick={() => onOpenVideo(video)}
                >
                  {src ? (
                    <img src={src} alt="" />
                  ) : (
                    <span className="thread-media-fallback" />
                  )}
                  <span className="thread-play" aria-hidden>
                    <span className="thread-play-icon">
                      <Play className="size-5" />
                    </span>
                  </span>
                  {video.durationSec != null ? (
                    <span className="thread-duration">{formatDuration(video.durationSec)}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
        {message.files.map((file) => {
          const Icon = KIND_ICON[file.kind];
          return (
            <button
              key={`f-${file.kind}-${file.msgId}`}
              type="button"
              className="thread-file"
              aria-label={`View ${file.name}`}
              onClick={() => onOpenFile(file)}
            >
              <span className="thread-file-icon">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{file.name}</span>
                <span className="mt-0.5 flex flex-wrap gap-1 text-xs text-muted">
                  <span className="meta-chip capitalize">{file.kind}</span>
                  {file.sizeBytes > 0 ? (
                    <span className="meta-chip tabular-nums">{formatBytes(file.sizeBytes)}</span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
        {message.text ? <p className="thread-text">{message.text}</p> : null}
        <p className="thread-time">{formatClock(message.date)}</p>
      </div>
    </article>
  );
}
