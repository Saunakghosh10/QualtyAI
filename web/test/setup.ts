import "fake-indexeddb/auto";
import { beforeEach } from "vitest";

// Minimal browser globals the store needs: localStorage and window events.
const mem = new Map<string, string>();
const localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};
Object.assign(globalThis, {
  window: { localStorage, addEventListener() {}, removeEventListener() {} },
  localStorage,
});

beforeEach(() => mem.clear());
