import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/telegram/errors";
import { createMockPort } from "@/telegram/mockPort";
import { TelegramProvider } from "@/telegram/TelegramProvider";
import type { VideoItem } from "@/telegram/types";
import { putCachedVideo } from "@/stores/videoCacheStore";
import { PlayerOverlay } from "./PlayerOverlay";

function video(msgId: number): VideoItem {
  return {
    msgId,
    peerId: "p",
    date: msgId,
    sizeBytes: 8,
    document: { id: msgId },
  };
}

const items = [video(3), video(2), video(1)];

describe("PlayerOverlay", () => {
  it("Next goes to older msgId; Previous to newer", async () => {
    const onChange = vi.fn();
    const blob = new Blob(["x"], { type: "video/mp4" });
    const port = createMockPort({
      downloadVideo: async () => blob,
    });
    render(
      <TelegramProvider port={port} configured>
        <PlayerOverlay
          items={items}
          currentMsgId={2}
          peer={{ peerId: "p", accessHash: "h" }}
          onClose={() => {}}
          onChangeMsgId={onChange}
        />
      </TelegramProvider>,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Next/ }));
    expect(onChange).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole("button", { name: /Previous/ }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("download failure shows Retry; Back still returns to grid", async () => {
    const onClose = vi.fn();
    const port = createMockPort({
      downloadVideo: async () => {
        throw new AppError("download_failed", "nope");
      },
    });
    render(
      <TelegramProvider port={port} configured>
        <div data-testid="grid-retry">grid</div>
        <PlayerOverlay
          items={items}
          currentMsgId={2}
          peer={{ peerId: "p", accessHash: "h" }}
          onClose={onClose}
          onChangeMsgId={() => {}}
        />
      </TelegramProvider>,
    );
    expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /^Back$/ }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId("grid-retry")).toBeTruthy();
  });

  it("Back does not unmount grid (grid still in document)", async () => {
    const blob = new Blob(["x"], { type: "video/mp4" });
    const port = createMockPort({ downloadVideo: async () => blob });
    render(
      <TelegramProvider port={port} configured>
        <div data-testid="grid-keep">grid</div>
        <PlayerOverlay
          items={items}
          currentMsgId={3}
          peer={{ peerId: "p", accessHash: "h" }}
          onClose={() => {}}
          onChangeMsgId={() => {}}
        />
      </TelegramProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("grid-keep")).toBeTruthy());
  });

  it("cache hit does not call downloadVideo", async () => {
    const download = vi.fn(async () => new Blob(["from-port"]));
    await putCachedVideo({
      peerId: "p",
      msgId: 3,
      blob: new Blob(["cached"], { type: "video/mp4" }),
      sizeBytes: 6,
      cachedAt: Date.now(),
    });
    const port = createMockPort({ downloadVideo: download });
    render(
      <TelegramProvider port={port} configured>
        <PlayerOverlay
          items={[video(3)]}
          currentMsgId={3}
          peer={{ peerId: "p", accessHash: "h" }}
          onClose={() => {}}
          onChangeMsgId={() => {}}
        />
      </TelegramProvider>,
    );
    await waitFor(() => expect(document.querySelector("video")).toBeTruthy());
    expect(download).not.toHaveBeenCalled();
  });
});
