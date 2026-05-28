import { describe, it, expect } from "vitest";
import { ProgressStore } from "@/domain/progress/store";
import { memoryBackend } from "@/domain/storage/backend";

describe("ProgressStore", () => {
  it("解答を記録しカード状態を保持する", () => {
    const store = new ProgressStore(memoryBackend());
    expect(store.getCard("theory-001")).toBeNull();

    const card = store.recordReview("theory-001", "good", true);
    expect(card.reps).toBeGreaterThan(0);
    expect(store.getCard("theory-001")).not.toBeNull();
    expect(store.logs()).toHaveLength(1);
    expect(store.logs()[0].correct).toBe(true);
  });

  it("バックエンドへ永続化し、再読込で復元できる(Date も復元)", () => {
    const backend = memoryBackend();
    const store = new ProgressStore(backend);
    store.recordReview("power-001", "good", true);

    const reopened = new ProgressStore(backend);
    const card = reopened.getCard("power-001");
    expect(card).not.toBeNull();
    expect(card!.due).toBeInstanceOf(Date);
    expect(Number.isNaN(card!.due.getTime())).toBe(false);
    expect(reopened.logs()).toHaveLength(1);
  });

  it("reset で全状態を消去する", () => {
    const store = new ProgressStore(memoryBackend());
    store.recordReview("law-001", "again", false);
    store.reset();
    expect(store.getCard("law-001")).toBeNull();
    expect(store.logs()).toHaveLength(0);
  });

  it("壊れた JSON は空状態として扱う", () => {
    const store = new ProgressStore(memoryBackend("{not valid json"));
    expect(store.logs()).toHaveLength(0);
  });

  it("snapshot/restore で別ストアへ進捗を移行できる", () => {
    const src = new ProgressStore(memoryBackend());
    src.recordReview("theory-001", "good", true);
    const json = src.snapshot();

    const dst = new ProgressStore(memoryBackend());
    expect(dst.restore(json)).toBe(true);
    expect(dst.getCard("theory-001")).not.toBeNull();
    expect(dst.logs()).toHaveLength(1);
  });

  it("restore は不正な JSON / 想定外形式で false を返し既存状態を保つ", () => {
    const store = new ProgressStore(memoryBackend());
    store.recordReview("theory-001", "good", true);

    expect(store.restore("not json")).toBe(false);
    expect(store.restore('{"version":2,"cards":{},"logs":[]}')).toBe(false);
    expect(store.restore('{"version":1,"cards":null,"logs":[]}')).toBe(false);
    expect(store.restore('{"version":1,"cards":{},"logs":"x"}')).toBe(false);
    // どの失敗ケースでも元の 1 件は残る
    expect(store.logs()).toHaveLength(1);
  });
});
