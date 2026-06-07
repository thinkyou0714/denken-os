/**
 * B2: params.value は realistic_range 内でなければならない。
 * problemSchema(zod superRefine) と validate-problems(ajv 補完チェック) の両輪で担保する。
 * ここでは zod スキーマで「有効は通る・範囲外は弾く」を実データで検証する。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { problemSchema } from "../../lib/engine/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const T1 = join(__dirname, "../../data/problems/T-0001.json");

describe("B2: params.value realistic_range 強制", () => {
  it("有効データ(T-0001)は parse 成功", () => {
    const p = JSON.parse(readFileSync(T1, "utf8"));
    expect(problemSchema.safeParse(p).success).toBe(true);
  });

  it("realistic_range を超える value は parse 失敗（理由に realistic_range を含む）", () => {
    const p = JSON.parse(readFileSync(T1, "utf8"));
    const first = Object.values(p.params)[0] as { value: number; realistic_range: [number, number] };
    first.value = first.realistic_range[1] + 1_000_000;
    const res = problemSchema.safeParse(p);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(JSON.stringify(res.error.issues)).toContain("realistic_range");
    }
  });

  it("realistic_range を下回る value も parse 失敗", () => {
    const p = JSON.parse(readFileSync(T1, "utf8"));
    const first = Object.values(p.params)[0] as { value: number; realistic_range: [number, number] };
    first.value = first.realistic_range[0] - 1_000_000;
    expect(problemSchema.safeParse(p).success).toBe(false);
  });
});
