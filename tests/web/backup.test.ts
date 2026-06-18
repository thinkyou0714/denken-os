import { describe, expect, it } from "vitest";
import { BACKUP_KEYS, exportBackup, importBackup } from "../../web/src/backup.js";
import { MemoryStorage } from "../helpers/storage.js";

describe("バックアップ（エクスポート/インポート）", () => {
  it("ラウンドトリップで学習データが復元される", () => {
    const src = new MemoryStorage();
    src.setItem("denken:logs", JSON.stringify([{ topic: "t", correct: true, atMs: 1 }]));
    src.setItem("denken:dailyGoal", "20");
    const json = exportBackup(src, Date.UTC(2026, 5, 10));

    const dst = new MemoryStorage();
    const result = importBackup(dst, json);
    expect(result.ok).toBe(true);
    expect(dst.getItem("denken:logs")).toBe(src.getItem("denken:logs"));
    expect(dst.getItem("denken:dailyGoal")).toBe("20");
  });

  it("APIキーは書き出さない（秘匿情報の保護）", () => {
    const src = new MemoryStorage();
    src.setItem("denken:apiKey", "sk-ant-secret");
    src.setItem("denken:logs", "[]");
    const json = exportBackup(src);
    expect(json).not.toContain("sk-ant-secret");
    expect(BACKUP_KEYS).not.toContain("denken:apiKey");
  });

  it("メタ情報（app/version/exportedAt）を含む", () => {
    const parsed = JSON.parse(exportBackup(new MemoryStorage(), Date.UTC(2026, 5, 10)));
    expect(parsed.app).toBe("denken-os");
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe("2026-06-10T00:00:00.000Z");
  });

  it("壊れたJSON・他アプリのファイルは拒否する", () => {
    const dst = new MemoryStorage();
    expect(importBackup(dst, "{oops").ok).toBe(false);
    expect(importBackup(dst, JSON.stringify({ app: "other", version: 1, data: {} })).ok).toBe(false);
    expect(importBackup(dst, "42").ok).toBe(false);
  });

  it("新しいバージョンのバックアップは拒否する（前方互換の事故防止）", () => {
    const r = importBackup(new MemoryStorage(), JSON.stringify({ app: "denken-os", version: 99, data: {} }));
    expect(r.ok).toBe(false);
  });

  it("許可リスト外のキーは黙って無視する（任意キー書き込みの防止）", () => {
    const dst = new MemoryStorage();
    const json = JSON.stringify({
      app: "denken-os",
      version: 1,
      exportedAt: "2026-06-10T00:00:00.000Z",
      data: { "denken:logs": "[]", evil: "payload", "denken:apiKey": "sk-injected" },
    });
    const r = importBackup(dst, json);
    expect(r.ok && r.restoredKeys).toEqual(["denken:logs"]);
    expect(dst.getItem("evil")).toBeNull();
    expect(dst.getItem("denken:apiKey")).toBeNull();
  });

  it("復元できるキーがゼロならエラーを返す", () => {
    const r = importBackup(new MemoryStorage(), JSON.stringify({ app: "denken-os", version: 1, data: {} }));
    expect(r.ok).toBe(false);
  });

  // ---- II-9: 値の形状検証（壊れた値で進捗を破壊しない）----

  it("denken:logs が配列でない値は拒否する", () => {
    const dst = new MemoryStorage();
    const json = JSON.stringify({
      app: "denken-os",
      version: 1,
      data: { "denken:logs": JSON.stringify({ not: "array" }) },
    });
    const r = importBackup(dst, json);
    expect(r.ok).toBe(false);
    // 拒否時は何も書き込まない。
    expect(dst.getItem("denken:logs")).toBeNull();
  });

  it("denken:logs の要素が {atMs:number, topic:string} でなければ拒否する", () => {
    const dst = new MemoryStorage();
    const json = JSON.stringify({
      app: "denken-os",
      version: 1,
      data: { "denken:logs": JSON.stringify([{ atMs: "x", topic: 1 }]) },
    });
    expect(importBackup(dst, json).ok).toBe(false);
  });

  it("denken:logs の壊れた JSON 文字列は拒否する", () => {
    const dst = new MemoryStorage();
    const json = JSON.stringify({
      app: "denken-os",
      version: 1,
      data: { "denken:logs": "{oops" },
    });
    expect(importBackup(dst, json).ok).toBe(false);
  });

  it("denken:cards が配列やプリミティブなら拒否する", () => {
    const dst = new MemoryStorage();
    const arr = JSON.stringify({ app: "denken-os", version: 1, data: { "denken:cards": "[]" } });
    expect(importBackup(dst, arr).ok).toBe(false);
    const prim = JSON.stringify({ app: "denken-os", version: 1, data: { "denken:cards": "42" } });
    expect(importBackup(dst, prim).ok).toBe(false);
  });

  it("正しい形状の logs/cards は復元できる", () => {
    const dst = new MemoryStorage();
    const logs = JSON.stringify([{ atMs: 1, topic: "三相交流電力", correct: true }]);
    const cards = JSON.stringify({ 三相交流電力: { due: "2026-06-10T00:00:00.000Z" } });
    const json = JSON.stringify({
      app: "denken-os",
      version: 1,
      data: { "denken:logs": logs, "denken:cards": cards },
    });
    const r = importBackup(dst, json);
    expect(r.ok).toBe(true);
    expect(dst.getItem("denken:logs")).toBe(logs);
    expect(dst.getItem("denken:cards")).toBe(cards);
  });

  it("不正な値があれば、他の正しいキーも含めてファイル全体を拒否する（部分復元しない）", () => {
    const dst = new MemoryStorage();
    const json = JSON.stringify({
      app: "denken-os",
      version: 1,
      data: { "denken:dailyGoal": "20", "denken:logs": "{broken" },
    });
    const r = importBackup(dst, json);
    expect(r.ok).toBe(false);
    // 正しい dailyGoal も書き込まれない（全体拒否でストアを汚さない）。
    expect(dst.getItem("denken:dailyGoal")).toBeNull();
  });

  it("空配列の logs・空オブジェクトの cards は妥当（拒否しない）", () => {
    const dst = new MemoryStorage();
    const json = JSON.stringify({
      app: "denken-os",
      version: 1,
      data: { "denken:logs": "[]", "denken:cards": "{}" },
    });
    expect(importBackup(dst, json).ok).toBe(true);
  });
});
