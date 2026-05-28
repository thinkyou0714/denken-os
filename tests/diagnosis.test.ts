import { describe, it, expect } from "vitest";
import { ProgressStore } from "@/domain/progress/store";
import { memoryBackend } from "@/domain/storage/backend";
import { diagnose, buildQueue } from "@/domain/srs/diagnosis";
import { problems, problemsBySubject } from "@/data/problems";

describe("弱点診断", () => {
  it("未学習時は全科目の習熟度が低く weakest は null", () => {
    const store = new ProgressStore(memoryBackend());
    const d = diagnose(problems, store);
    expect(d.weakest).toBeNull();
    for (const s of d.subjects) {
      expect(s.reviews).toBe(0);
      expect(s.mastery).toBeLessThan(30);
    }
  });

  it("正答を重ねると該当科目の習熟度が上がる", () => {
    const store = new ProgressStore(memoryBackend());
    const now = new Date("2026-01-01T00:00:00Z");
    const before = diagnose(problems, store, now).subjects.find(
      (s) => s.subject === "theory",
    )!;

    for (const p of problemsBySubject("theory")) {
      store.recordReview(p.id, "good", true, now);
    }
    const after = diagnose(problems, store, now).subjects.find(
      (s) => s.subject === "theory",
    )!;

    expect(after.mastery).toBeGreaterThan(before.mastery);
    expect(after.accuracy).toBe(1);
    expect(after.seen).toBe(problemsBySubject("theory").length);
  });

  it("誤答が多い科目が weakest に選ばれる", () => {
    const store = new ProgressStore(memoryBackend());
    const now = new Date("2026-01-01T00:00:00Z");
    for (const p of problemsBySubject("theory")) {
      store.recordReview(p.id, "good", true, now);
    }
    for (const p of problemsBySubject("law")) {
      store.recordReview(p.id, "again", false, now);
    }
    expect(diagnose(problems, store, now).weakest).toBe("law");
  });
});

describe("復習キュー", () => {
  it("初回は全問題が出題対象", () => {
    const store = new ProgressStore(memoryBackend());
    const queue = buildQueue(problems, store, new Date(), 100);
    expect(queue).toHaveLength(problems.length);
  });

  it("'good' 解答済みの問題はキューから外れる", () => {
    const store = new ProgressStore(memoryBackend());
    const now = new Date("2026-01-01T00:00:00Z");
    store.recordReview("theory-001", "good", true, now);
    const queue = buildQueue(problems, store, now, 100);
    expect(queue.some((p) => p.id === "theory-001")).toBe(false);
  });

  it("limit で件数を制限する", () => {
    const store = new ProgressStore(memoryBackend());
    expect(buildQueue(problems, store, new Date(), 3)).toHaveLength(3);
  });

  it("科目で絞った pool を渡すとその科目のみ出題される(重点学習)", () => {
    const store = new ProgressStore(memoryBackend());
    const pool = problemsBySubject("machinery");
    const queue = buildQueue(pool, store, new Date(), 100);
    expect(queue.length).toBe(pool.length);
    expect(queue.every((p) => p.subject === "machinery")).toBe(true);
  });
});
