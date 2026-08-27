import { useCallback, useState } from "react";

export const GRID_SIZE_KEY = "tg-video-browser:grid-size";
export const GRID_SIZE_STEPS = [88, 112, 136, 160, 192, 232, 280] as const;
export const DEFAULT_GRID_INDEX = 3;

function clampIndex(index: number): number {
  if (!Number.isFinite(index)) return DEFAULT_GRID_INDEX;
  return Math.min(GRID_SIZE_STEPS.length - 1, Math.max(0, Math.round(index)));
}

export function loadGridSizeIndex(): number {
  if (typeof localStorage === "undefined") return DEFAULT_GRID_INDEX;
  try {
    const raw = localStorage.getItem(GRID_SIZE_KEY);
    if (raw == null) return DEFAULT_GRID_INDEX;
    return clampIndex(Number(raw));
  } catch {
    return DEFAULT_GRID_INDEX;
  }
}

export function saveGridSizeIndex(index: number): number {
  const next = clampIndex(index);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(GRID_SIZE_KEY, String(next));
  }
  return next;
}

export function gridSizePx(index: number): number {
  return GRID_SIZE_STEPS[clampIndex(index)]!;
}

export function useGridSize() {
  const [index, setIndex] = useState(loadGridSizeIndex);
  const commit = useCallback((next: number) => {
    const saved = saveGridSizeIndex(next);
    setIndex(saved);
    return saved;
  }, []);
  return {
    index,
    px: gridSizePx(index),
    canSmaller: index > 0,
    canLarger: index < GRID_SIZE_STEPS.length - 1,
    smaller: () => commit(index - 1),
    larger: () => commit(index + 1),
  };
}
