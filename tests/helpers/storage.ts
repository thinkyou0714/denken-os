/**
 * tests/helpers/storage.ts — テスト用 StorageLike 実装の共有ヘルパー（I-063, I-065）。
 *
 * 複数のテストファイルに重複定義されていた MemoryStorage / ThrowingStorage を
 * ここに一元化し、各テストはこのモジュールを import して使う。
 */
import type { StorageLike } from "../../web/src/store.js";

/**
 * DOM なしでテストするためのインメモリ Storage。
 * localStorage の代替として StorageLike を実装する。
 */
export class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();

  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }

  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }

  removeItem(k: string): void {
    this.m.delete(k);
  }
}

/**
 * setItem が常に DOMException（QuotaExceededError）を throw する Storage。
 * iOS プライベートモード・quota 超過ケースの再現に使う（I-065）。
 */
export class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    return null;
  }

  setItem(): void {
    throw new DOMException("QuotaExceededError");
  }
}
