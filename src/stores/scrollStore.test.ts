import { describe, expect, it } from "vitest";
import { loadGridScroll, saveGridScroll } from "./scrollStore";

describe("scrollStore", () => {
  it("saves and restores scroll; missing peer returns null", () => {
    sessionStorage.clear();
    expect(loadGridScroll("p")).toBeNull();
    saveGridScroll("p", 80, 42);
    expect(loadGridScroll("p")).toEqual({ scrollTop: 80, anchorMsgId: 42 });
  });
});
