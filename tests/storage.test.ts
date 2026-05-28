// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import {
  localStorageBackend,
  memoryBackend,
} from "@/domain/storage/backend";

describe("memoryBackend", () => {
  it("read/write/remove のラウンドトリップ", () => {
    const b = memoryBackend();
    expect(b.read()).toBeNull();
    b.write("hello");
    expect(b.read()).toBe("hello");
    b.remove();
    expect(b.read()).toBeNull();
  });
});

describe("localStorageBackend graceful degradation", () => {
  const originalLocalStorage = window.localStorage;

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
    });
  });

  it("通常時は localStorage と読み書きできる", () => {
    const b = localStorageBackend("test-key-1");
    b.write("v1");
    expect(b.read()).toBe("v1");
    b.remove();
    expect(b.read()).toBeNull();
  });

  it("localStorage が throw してもアプリは落ちない(プライベートブラウズ等)", () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("access denied");
        },
        setItem: () => {
          throw new Error("quota exceeded");
        },
        removeItem: () => {
          throw new Error("denied");
        },
      },
      configurable: true,
    });
    const b = localStorageBackend("test-key-2");
    expect(b.read()).toBeNull();
    expect(() => b.write("x")).not.toThrow();
    expect(() => b.remove()).not.toThrow();
  });
});
