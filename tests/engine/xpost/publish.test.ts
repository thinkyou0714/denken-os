import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DraftExportClient } from "../../../lib/clients/x-client.js";
import { generate } from "../../../lib/engine/generate.js";
import { StubNarrator } from "../../../lib/engine/narrate.js";
import type { Problem } from "../../../lib/engine/schema.js";
import { capacitorEnergy } from "../../../lib/engine/templates/index.js";
import { validateProblem } from "../../../lib/engine/validate.js";
import { scheduleProblem } from "../../../lib/engine/xpost/publish.js";
import { morningPoll } from "../../../lib/engine/xpost/toXPost.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const T0001: Problem = JSON.parse(readFileSync(join(__dirname, "../../../data/problems/T-0001.json"), "utf8"));

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("numeric 形式テンプレート（二次=計算の布石）", () => {
  it("コンデンサ静電エネルギー W=½CV² を numeric で算出（選択肢なし）", () => {
    const g = capacitorEnergy.generateFrom({ capacitance: 10, voltage: 100 });
    expect(g).not.toBeNull();
    // W=0.5*10e-6*100^2 = 0.05 J = 50 mJ
    expect(g!.format).toBe("numeric");
    expect(g!.answerText).toBe("50");
    expect(g!.choices).toBeUndefined();
  });

  it("numeric 問題が生成され、choices 無しで schema/不変条件を通る", async () => {
    const [p] = await generate(capacitorEnergy, { count: 1, narrator: new StubNarrator(), rng: seededRng(5) });
    expect(p!.format).toBe("numeric");
    expect(p!.choices).toBeUndefined();
    expect(validateProblem(p!).ok).toBe(true);
  });
});

describe("morningPoll", () => {
  it("multiple_choice には poll(最大4択)を併設する", () => {
    const poll = morningPoll(T0001);
    expect(poll).not.toBeNull();
    expect(poll!.options).toEqual(["2.56", "3.2", "4.0", "9.6"]);
  });

  it("numeric には poll を併設しない", async () => {
    const [p] = await generate(capacitorEnergy, { count: 1, narrator: new StubNarrator(), rng: seededRng(5) });
    expect(morningPoll(p!)).toBeNull();
  });
});

describe("scheduleProblem（02↔03↔x-client 配線）", () => {
  it("朝(poll併設)→夜(朝を引用)を下書きとして予約する", async () => {
    const client = new DraftExportClient();
    const res = await scheduleProblem(T0001, { client, day: new Date("2026-06-01T00:00:00"), rng: seededRng(1) });
    expect(res.hasPoll).toBe(true);
    expect(res.morning.length).toBeGreaterThanOrEqual(1);
    expect(res.evening.length).toBeGreaterThanOrEqual(1);
    // 先頭の朝ポストに poll が付き、夜先頭が朝先頭を引用している
    expect(client.drafts[0]!.poll?.options.length).toBe(4);
    const eveningHead = client.drafts.find((d) => d.quoteOfId !== undefined);
    expect(eveningHead?.quoteOfId).toBe(res.morning[0]!.id);
    // 実投稿ではなくエクスポート
    expect(res.morning[0]!.exported).toBe(true);
  });

  it("検証が揃わない問題は公開ゲートで弾く（fail-closed）", async () => {
    const draft: Problem = { ...T0001, validation: { ...T0001.validation, human_checked: false }, status: "draft" };
    await expect(scheduleProblem(draft, { client: new DraftExportClient() })).rejects.toThrow(/公開ゲート不通過/);
  });

  it("retracted は投稿しない", async () => {
    const retracted: Problem = { ...T0001, status: "retracted" };
    await expect(scheduleProblem(retracted, { client: new DraftExportClient() })).rejects.toThrow(/retracted/);
  });
});
