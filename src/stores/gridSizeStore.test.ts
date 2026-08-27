import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_GRID_INDEX,
  GRID_SIZE_KEY,
  GRID_SIZE_STEPS,
  gridSizePx,
  loadGridSizeIndex,
  saveGridSizeIndex,
} from "./gridSizeStore";

describe("gridSizeStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to a mid size until the user changes it", () => {
    expect(loadGridSizeIndex()).toBe(DEFAULT_GRID_INDEX);
    expect(gridSizePx(DEFAULT_GRID_INDEX)).toBe(GRID_SIZE_STEPS[DEFAULT_GRID_INDEX]);
  });

  it("persists the chosen size across loads", () => {
    const saved = saveGridSizeIndex(5);
    expect(saved).toBe(5);
    expect(localStorage.getItem(GRID_SIZE_KEY)).toBe("5");
    expect(loadGridSizeIndex()).toBe(5);
    expect(gridSizePx(5)).toBe(GRID_SIZE_STEPS[5]);
  });

  it("clamps out-of-range values so the grid cannot overflow", () => {
    expect(saveGridSizeIndex(-4)).toBe(0);
    expect(saveGridSizeIndex(99)).toBe(GRID_SIZE_STEPS.length - 1);
  });
});
