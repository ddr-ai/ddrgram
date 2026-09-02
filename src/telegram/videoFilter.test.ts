import { describe, expect, it } from "vitest";
import { isPlayableVideo } from "./videoFilter";

describe("isPlayableVideo", () => {
  it("accepts a normal video", () => {
    expect(
      isPlayableVideo({ hasVideoAttr: true, roundMessage: false, animated: false }),
    ).toBe(true);
  });

  it("rejects GIFs", () => {
    expect(
      isPlayableVideo({ hasVideoAttr: true, roundMessage: false, animated: true }),
    ).toBe(false);
  });

  it("rejects round video notes", () => {
    expect(
      isPlayableVideo({ hasVideoAttr: true, roundMessage: true, animated: false }),
    ).toBe(false);
  });

  it("rejects documents with no video attribute", () => {
    expect(
      isPlayableVideo({ hasVideoAttr: false, roundMessage: false, animated: false }),
    ).toBe(false);
  });
});
