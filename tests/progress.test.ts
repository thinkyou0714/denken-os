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
});
