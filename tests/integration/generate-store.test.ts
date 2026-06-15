/**
 * 統合テスト: generate → validate → FileStore 保存 → 読込（II-176）。
 *
 * エンジンの生成パイプラインとファイルストアを結合した end-to-end 検証。
 * 一時ディレクトリを使い、テスト後にクリーンアップする。
 */
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import { threePhasePower } from "../../lib/engine/templates/index.js";
import { answerInChoices, answerIsClean, validateProblem } from "../../lib/engine/validate.js";
import { fileStores } from "../../lib/store/file-store.js";
import { seededRng } from "../helpers/rng.js";

describe("統合: generate → validate → FileStore 保存 → 読込（II-176）", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `denken-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("10問生成 → validate 全通過 → FileStore 保存 → 全件読込一致", async () => {
    const template = threePhasePower;

    // 1. 生成
    const problems = await generate(template, {
      count: 10,
      narrator: new StubNarrator(),
      rng: seededRng(999),
    });
    expect(problems.length).toBe(10);

    // 2. validate 全通過
    for (const p of problems) {
      expect(validateProblem(p).ok, `${p.id}: validateProblem`).toBe(true);
      expect(answerInChoices(p), `${p.id}: answerInChoices`).toBe(true);
      expect(answerIsClean(p), `${p.id}: answerIsClean`).toBe(true);
      expect(p.validation.physically_valid, `${p.id}: physically_valid`).toBe(true);
    }

    // 3. FileStore へ保存
    const stores = fileStores(tmpDir);
    for (const p of problems) {
      await stores.problems.upsert(p);
    }

    // 4. 全件読込 → 一致確認
    const loaded = await stores.problems.list();
    expect(loaded.length).toBe(10);

    for (const p of problems) {
      const found = await stores.problems.get(p.id);
      expect(found, `${p.id}: get() で取得できる`).toBeDefined();
      expect(found?.id).toBe(p.id);
      expect(found?.statement).toBe(p.statement);
      expect(found?.answer).toBe(p.answer);
      expect(found?.choices).toEqual(p.choices);
    }
  });

  it("upsert は既存を上書き（冪等性）", async () => {
    const template = threePhasePower;

    const problems = await generate(template, {
      count: 1,
      narrator: new StubNarrator(),
      rng: seededRng(111),
    });
    const p = problems[0];
    expect(p).toBeDefined();
    if (!p) return;

    const stores = fileStores(tmpDir);
    await stores.problems.upsert(p);
    await stores.problems.upsert(p); // 2回目

    const all = await stores.problems.list();
    expect(all.length).toBe(1); // 重複なし
  });

  it("AnswerLog 保存 → byUser 読込（lib/scheduler/diagnosis.ts の型に合わせる）", async () => {
    const stores = fileStores(tmpDir);
    const userId = "user-test-001";
    const log1 = { topic: "三相交流電力", correct: true, atMs: Date.UTC(2026, 0, 1) };
    const log2 = { topic: "三相交流電力", correct: false, atMs: Date.UTC(2026, 0, 2) };

    await stores.answerLogs.append(userId, log1);
    await stores.answerLogs.append(userId, log2);

    const logs = await stores.answerLogs.byUser(userId);
    expect(logs.length).toBe(2);
    expect(logs[0]?.topic).toBe("三相交流電力");
    expect(logs[0]?.correct).toBe(true);
    expect(logs[1]?.correct).toBe(false);
  });

  it("ReviewState 保存 → get/byUser 読込（lib/scheduler/types.ts の型に合わせる）", async () => {
    const stores = fileStores(tmpDir);
    const userId = "user-test-002";
    const topic = "直流機";
    const state = {
      reps: 3,
      lapses: 1,
      intervalDays: 6,
      ease: 2.5,
      dueMs: Date.UTC(2026, 0, 7),
      lastReviewMs: Date.UTC(2026, 0, 1),
    };

    await stores.reviewStates.set(userId, topic, state);
    const loaded = await stores.reviewStates.get(userId, topic);
    expect(loaded).toBeDefined();
    expect(loaded?.reps).toBe(3);
    expect(loaded?.ease).toBe(2.5);
    expect(loaded?.intervalDays).toBe(6);

    const byUser = await stores.reviewStates.byUser(userId);
    expect(byUser.get(topic)).toEqual(state);
  });

  it("JSON 破損ファイルに対して fallback を返す（II-138 堅牢性）", async () => {
    const { writeFileSync } = await import("node:fs");
    const corruptDir = join(tmpDir, "corrupt");
    mkdirSync(corruptDir, { recursive: true });
    // problems.json に壊れた JSON を書き込む
    writeFileSync(join(corruptDir, "problems.json"), "{ broken json }", "utf8");
    const corruptStores = fileStores(corruptDir);
    // 破損でも list() は空配列を返す（クラッシュしない）
    const result = await corruptStores.problems.list();
    expect(result).toEqual([]);
  });

  it("list() の topic フィルタが機能する", async () => {
    const template = threePhasePower;

    const problems = await generate(template, {
      count: 3,
      narrator: new StubNarrator(),
      rng: seededRng(777),
    });

    const stores = fileStores(tmpDir);
    for (const p of problems) {
      await stores.problems.upsert(p);
    }

    // 全問題のトピックで絞り込み → 全件ヒット
    const topic = problems[0]?.topic;
    if (!topic) return;
    const byTopic = await stores.problems.list({ topic });
    expect(byTopic.every((p) => p.topic === topic)).toBe(true);
    expect(byTopic.length).toBeGreaterThan(0);

    // 存在しないトピック → 0件
    const none = await stores.problems.list({ topic: "存在しないトピック" });
    expect(none.length).toBe(0);
  });
});
