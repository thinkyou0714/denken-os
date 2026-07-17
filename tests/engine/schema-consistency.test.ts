/**
 * problem-schema.json(ajv) と lib/engine/schema.ts(zod) は別定義なのでドリフトしうる。
 * 両者が同じ判定をすることを代表ケースで担保する（根本対策: ドリフト検知）。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import { problemSchema } from "../../lib/engine/schema.js";
import { threePhasePower } from "../../lib/engine/templates/index.js";
import { loadProblemFixture } from "../helpers/fixtures.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const jsonSchema = JSON.parse(readFileSync(join(ROOT, "docs/x-strategy/templates/problem-schema.json"), "utf8"));
const T0001 = loadProblemFixture("T-0001");

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const ajvValidate = ajv.compile(jsonSchema);

function bothAccept(obj: unknown): { ajv: boolean; zod: boolean } {
  return { ajv: ajvValidate(obj) as boolean, zod: problemSchema.safeParse(obj).success };
}

describe("schema ドリフト検知（ajv ⇄ zod）", () => {
  it("検証済みサンプルは両方が受理する", () => {
    const r = bothAccept(T0001);
    expect(r.ajv).toBe(true);
    expect(r.zod).toBe(true);
  });

  it("生成された validated 候補は両方が受理する", async () => {
    let s = 4242;
    const rng = () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const problems = await generate(threePhasePower, { count: 3, narrator: new StubNarrator(), rng });
    expect(problems.length).toBe(3);
    for (const p of problems) {
      const r = bothAccept(p);
      expect(r.ajv).toBe(true);
      expect(r.zod).toBe(true);
    }
  });

  it("必須フィールド欠落は両方が拒否する", () => {
    const { answer, ...broken } = T0001;
    const r = bothAccept(broken);
    expect(r.ajv).toBe(false);
    expect(r.zod).toBe(false);
  });

  it("status=validated で検証4項目falseは両方が拒否する", () => {
    const broken = { ...T0001, validation: { ...T0001.validation, human_checked: false }, status: "validated" };
    const r = bothAccept(broken);
    expect(r.ajv).toBe(false);
    expect(r.zod).toBe(false);
  });

  // 空文字・空配列のドリフト是正（Round-5）: zod は .min(1) で弾くが ajv は minLength/minItems
  // 未指定で空を受理していた。両者を parity させ、空値を両方が拒否することを固定する。
  it.each(["id", "topic", "statement", "answer"])("空文字の %s は両方が拒否する（ajv⇄zod parity）", (field) => {
    const r = bothAccept({ ...T0001, [field]: "" });
    expect(r.ajv).toBe(false);
    expect(r.zod).toBe(false);
  });

  it("空の solution 配列は両方が拒否する（ajv⇄zod parity）", () => {
    const r = bothAccept({ ...T0001, solution: [] });
    expect(r.ajv).toBe(false);
    expect(r.zod).toBe(false);
  });

  // 過去問系の citation ドリフト是正: zod は trim().length>0 の refine で空白のみを弾くが、
  // ajv 側は minLength/pattern 未指定で "   " を受理していた（実在ドリフト）。
  it.each([
    "past_exam_modified",
    "past_exam_quoted",
  ])("空白のみの citation（source.type=%s）は両方が拒否する（ajv⇄zod parity）", (type) => {
    const r = bothAccept({ ...T0001, source: { type, citation: "   " } });
    expect(r.ajv).toBe(false);
    expect(r.zod).toBe(false);
  });

  it("非空の citation（past_exam_modified）は両方が受理する", () => {
    const r = bothAccept({
      ...T0001,
      source: { type: "past_exam_modified", citation: "令和5年度 第二種 一次 理論（改題）" },
    });
    expect(r.ajv).toBe(true);
    expect(r.zod).toBe(true);
  });
});
