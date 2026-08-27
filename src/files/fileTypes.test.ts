import { describe, expect, it } from "vitest";
import { classifyFile, extensionOf, safeDownloadName } from "./fileTypes";

describe("classifyFile", () => {
  it("accepts the Other-tab file types", () => {
    expect(classifyFile("shot.png")).toBe("image");
    expect(classifyFile("notes.pdf")).toBe("document");
    expect(classifyFile("readme.txt")).toBe("document");
    expect(classifyFile("guide.md")).toBe("document");
    expect(classifyFile("script.py")).toBe("code");
    expect(classifyFile("app.js")).toBe("code");
    expect(classifyFile("book.epub")).toBe("ebook");
    expect(classifyFile("bundle.zip")).toBe("archive");
    expect(classifyFile("src.tar")).toBe("archive");
    expect(classifyFile("disk.iso")).toBe("package");
    expect(classifyFile("pkg.deb")).toBe("package");
    expect(classifyFile("pkg.rpm")).toBe("package");
    expect(classifyFile("pic", "image/jpeg")).toBe("image");
  });

  it("rejects videos and unrelated types", () => {
    expect(classifyFile("clip.mp4", "video/mp4")).toBeNull();
    expect(classifyFile("song.mp3", "audio/mpeg")).toBeNull();
    expect(classifyFile("model.gguf")).toBeNull();
  });
});

describe("extensionOf / safeDownloadName", () => {
  it("parses the last extension", () => {
    expect(extensionOf("a/b/c.PDF")).toBe("pdf");
  });

  it("strips path characters from download names", () => {
    expect(safeDownloadName("a/b:c.pdf")).toBe("a_b_c.pdf");
  });
});
