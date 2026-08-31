import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import "fake-indexeddb/auto";
import { afterEach, beforeEach } from "vitest";
import { deleteDatabase } from "@/stores/db";

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

function ensureStorage(name: "localStorage" | "sessionStorage") {
  try {
    const current = globalThis[name];
    current.setItem("__probe", "1");
    current.removeItem("__probe");
  } catch {
    const storage = memoryStorage();
    Object.defineProperty(globalThis, name, { configurable: true, value: storage });
    if (typeof window !== "undefined") {
      Object.defineProperty(window, name, { configurable: true, value: storage });
    }
  }
}

ensureStorage("localStorage");
ensureStorage("sessionStorage");

beforeEach(async () => {
  await deleteDatabase();
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // jsdom storage
  }
});

afterEach(() => {
  cleanup();
});

if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:mock";
  URL.revokeObjectURL = () => {};
}

if (typeof globalThis.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    constructor(type: string, params?: MouseEventInit) {
      super(type, params);
    }
  }
  globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

const proto = globalThis.HTMLElement?.prototype;
if (proto && typeof proto.hasPointerCapture !== "function") {
  proto.hasPointerCapture = () => false;
  proto.setPointerCapture = () => {};
  proto.releasePointerCapture = () => {};
}
if (proto && typeof proto.scrollIntoView !== "function") {
  proto.scrollIntoView = () => {};
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }) as MediaQueryList;
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
