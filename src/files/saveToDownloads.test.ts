import { afterEach, describe, expect, it, vi } from "vitest";
import { saveBlobToDownloads } from "./saveToDownloads";

describe("saveBlobToDownloads", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers a browser download with the given filename", () => {
    const click = vi.fn();
    const create = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag: string) => {
        const el = document.createElementNS("http://www.w3.org/1999/xhtml", tag);
        if (tag === "a") {
          Object.defineProperty(el, "click", { value: click });
        }
        return el as unknown as HTMLElement;
      });
    saveBlobToDownloads(new Blob(["hi"], { type: "text/plain" }), "notes.txt");
    expect(create).toHaveBeenCalledWith("a");
    expect(click).toHaveBeenCalled();
  });
});
