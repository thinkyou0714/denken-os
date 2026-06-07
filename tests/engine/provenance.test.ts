/**
 * provenance gate（DI-13/DI-5）: status=published は検収来歴(validated_by/validated_at/method)が必須。
 * validated には課さない（前向き契約・既存データの偽 backfill 回避）。
 * ajv(problem-schema.json) と zod(schema.ts) の両ゲートで同じ判定になることも担保する。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { problemSchema } from "../../lib/engine/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const jsonSchema = JSON.parse(readFileSync(join(ROOT, "docs/x-strategy/templates/problem-schema.json"), "utf8"));
const T1 = JSON.parse(readFileSync(join(ROOT, "data/problems/T-0001.json"), "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const ajvValidate = ajv.compile(jsonSchema);

function both(obj: unknown): { ajv: boolean; zod: boolean } {
  return { ajv: ajvValidate(obj) as boolean, zod: problemSchema.safeParse(obj).success };
}

const PROV = { validated_by: "監修者A", validated_at: "2026-06-01", method: "human_review" };

describe("provenance gate（published のみ必須・ajv⇄zod parity）", () => {
  it("validated は provenance 無しでも通る（前向き契約・backfill 不要）", () => {
    const r = both(T1); // T-0001 は status=validated, provenance 無し
    expect(r.ajv).toBe(true);
    expect(r.zod).toBe(true);
  });

  it("published は provenance 無しだと両ゲートが弾く", () => {
    const r = both({ ...T1, status: "published" });
    expect(r.ajv).toBe(false);
    expect(r.zod).toBe(false);
  });

  it("published + 正しい provenance は両ゲートが通す", () => {
    const r = both({ ...T1, status: "published", validation: { ...T1.validation, provenance: PROV } });
    expect(r.ajv).toBe(true);
    expect(r.zod).toBe(true);
  });

  it("provenance は指定時 3項目必須（欠落は両ゲートが弾く）", () => {
    const bad = {
      ...T1,
      status: "published",
      validation: { ...T1.validation, provenance: { validated_by: "x" } },
    };
    const r = both(bad);
    expect(r.ajv).toBe(false);
    expect(r.zod).toBe(false);
  });

  it("validated でも provenance を付けるなら整形は検証される（空項目は弾く）", () => {
    const bad = {
      ...T1, // validated のまま
      validation: { ...T1.validation, provenance: { validated_by: "", validated_at: "2026-06-01", method: "x" } },
    };
    const r = both(bad);
    expect(r.ajv).toBe(false); // minLength 1 違反
    expect(r.zod).toBe(false);
  });
});
