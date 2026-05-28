import { describe, it, expect } from "vitest";
import { SettingsStore, daysUntilExam } from "@/domain/settings/store";
import { memoryBackend } from "@/domain/storage/backend";

describe("SettingsStore", () => {
  it("初期化時に月次フリーズが付与される(上限まで)", () => {
    const s = new SettingsStore(memoryBackend(), new Date(2026, 4, 28));
    expect(s.freezes).toBe(2);
    expect(s.maxFreezes).toBe(4);
  });

  it("同じ月の再生成では追加付与されない", () => {
    const backend = memoryBackend();
    new SettingsStore(backend, new Date(2026, 4, 1));
    const s2 = new SettingsStore(backend, new Date(2026, 4, 28));
    expect(s2.freezes).toBe(2);
  });

  it("新しい月では上限まで追加付与される", () => {
    const backend = memoryBackend();
    new SettingsStore(backend, new Date(2026, 4, 1)); // 5月: +2 → 2
    const s2 = new SettingsStore(backend, new Date(2026, 5, 1)); // 6月: +2 → 4
    expect(s2.freezes).toBe(4);
    const s3 = new SettingsStore(backend, new Date(2026, 6, 1)); // 7月: 上限維持 → 4
    expect(s3.freezes).toBe(4);
  });

  it("examDate は YYYY-MM-DD のみ受け付ける", () => {
    const s = new SettingsStore(memoryBackend(), new Date(2026, 4, 28));
    s.setExamDate("2026-08-30");
    expect(s.examDate).toBe("2026-08-30");
    s.setExamDate("not-a-date");
    expect(s.examDate).toBeNull();
    s.setExamDate(null);
    expect(s.examDate).toBeNull();
  });

  it("minimalUI のトグル", () => {
    const s = new SettingsStore(memoryBackend(), new Date(2026, 4, 28));
    expect(s.minimalUI).toBe(false);
    s.setMinimalUI(true);
    expect(s.minimalUI).toBe(true);
  });

  it("永続化: 再起動後も値が残る", () => {
    const backend = memoryBackend();
    const s1 = new SettingsStore(backend, new Date(2026, 4, 28));
    s1.setExamDate("2026-08-30");
    s1.setMinimalUI(true);
    const s2 = new SettingsStore(backend, new Date(2026, 4, 28));
    expect(s2.examDate).toBe("2026-08-30");
    expect(s2.minimalUI).toBe(true);
  });
});

describe("daysUntilExam", () => {
  it("試験日が未来なら正の日数", () => {
    expect(daysUntilExam("2026-08-30", new Date(2026, 4, 28))).toBe(94);
  });
  it("試験日が当日なら 0", () => {
    expect(daysUntilExam("2026-05-28", new Date(2026, 4, 28))).toBe(0);
  });
  it("無効値は null", () => {
    expect(daysUntilExam(null, new Date())).toBeNull();
    expect(daysUntilExam("garbage", new Date())).toBeNull();
  });
});
