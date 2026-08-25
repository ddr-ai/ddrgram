import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteDatabase } from "./db";
import {
  clearSessionString,
  loadSessionString,
  saveSessionString,
} from "./sessionStore";

describe("sessionStore", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("round-trips a session string and clears it", async () => {
    await saveSessionString("sess");
    expect(await loadSessionString()).toBe("sess");
    await clearSessionString();
    expect(await loadSessionString()).toBeNull();
  });
});
