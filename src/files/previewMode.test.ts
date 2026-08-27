import { describe, expect, it } from "vitest";
import { decodeText, previewMode } from "./previewMode";

describe("previewMode", () => {
  it("maps supported types to a viewer", () => {
    expect(previewMode({ kind: "image", ext: "png", mime: "image/png", name: "a.png" })).toBe(
      "image",
    );
    expect(previewMode({ kind: "document", ext: "pdf", mime: "application/pdf", name: "a.pdf" })).toBe(
      "pdf",
    );
    expect(previewMode({ kind: "code", ext: "py", mime: "", name: "a.py" })).toBe("text");
    expect(previewMode({ kind: "document", ext: "txt", mime: "text/plain", name: "a.txt" })).toBe(
      "text",
    );
    expect(previewMode({ kind: "archive", ext: "zip", mime: "", name: "a.zip" })).toBe("list");
    expect(previewMode({ kind: "folder", ext: "", mime: "", name: "Album" })).toBe("list");
    expect(previewMode({ kind: "package", ext: "iso", mime: "", name: "a.iso" })).toBe("list");
  });

  it("decodes text for the reader", () => {
    expect(decodeText(new TextEncoder().encode("hello"))).toBe("hello");
  });
});
