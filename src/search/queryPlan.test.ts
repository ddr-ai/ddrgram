import { describe, expect, it } from "vitest";
import {
  buildSearchSources,
  rankHits,
  scoreSearchHit,
  searchExpansions,
} from "./queryPlan";

describe("searchExpansions", () => {
  it("puts the original query first", () => {
    expect(searchExpansions("  Funny Cats  ")).toEqual(
      expect.arrayContaining(["Funny Cats"]),
    );
    expect(searchExpansions("Funny Cats")[0]).toBe("Funny Cats");
  });

  it("broadens multi-word queries by dropping trailing words, then each word", () => {
    const plan = searchExpansions("funny cats videos");
    expect(plan[0]).toBe("funny cats videos");
    expect(plan).toContain("funny cats");
    expect(plan).toContain("funny");
    expect(plan).toContain("videos");
    expect(plan.indexOf("funny cats")).toBeLessThan(plan.indexOf("funny"));
  });

  it("shortens a single token so later pages are less specific", () => {
    const plan = searchExpansions("cats");
    expect(plan[0]).toBe("cats");
    expect(plan).toContain("cat");
    expect(plan.indexOf("cats")).toBeLessThan(plan.indexOf("cat"));
  });

  it("returns empty for blank input", () => {
    expect(searchExpansions("   ")).toEqual([]);
  });
});

describe("buildSearchSources", () => {
  it("starts with contacts, then global channels, then groups, then broader contacts", () => {
    const sources = buildSearchSources("cats");
    expect(sources[0]).toEqual({ type: "contacts", q: "cats" });
    expect(sources[1]).toEqual({
      type: "global",
      q: "cats",
      broadcastsOnly: true,
    });
    expect(sources[2]).toEqual({ type: "global", q: "cats", groupsOnly: true });
    expect(sources.slice(3).every((s) => s.type === "contacts")).toBe(true);
  });
});

describe("scoreSearchHit", () => {
  it("ranks exact username above a loose title match", () => {
    const q = "cats";
    const exact = scoreSearchHit(q, { title: "Something", username: "cats" });
    const loose = scoreSearchHit(q, { title: "Best cats ever" });
    expect(exact).toBeGreaterThan(loose);
  });
});

describe("rankHits", () => {
  it("orders closest matches first", () => {
    const ranked = rankHits("cats", [
      { title: "Dog clips", username: "dogs" },
      { title: "Daily cats", username: "dailycats" },
      { title: "Cats", username: "cats" },
    ]);
    expect(ranked.map((h) => h.username ?? h.title)).toEqual([
      "cats",
      "dailycats",
      "dogs",
    ]);
  });
});
