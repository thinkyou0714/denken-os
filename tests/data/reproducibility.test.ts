/**
 * data/problems/*.json（手書きの種問題）が、対応するテンプレートの決定論計算と
 * 一致し続けることを保証する（根本対策: データ ⇔ エンジンのドリフト検知）。
 * テンプレの式を変えて種問題が乖離した場合、ここで落ちる。
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getTemplate } from "../../lib/engine/templates/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data/problems");

interface RawProblem {
  id: string;
  topic: string;
  format?: string;
  answer: string;
  choices?: string[];
  params?: Record<string, { value: number }>;
}

function loadProblems(): RawProblem[] {
  return readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(DATA_DIR, f), "utf8")) as RawProblem);
}

describe("data ⇔ engine 整合（種問題はテンプレ計算と一致する）", () => {
  const problems = loadProblems();

  it("種問題が1件以上ある", () => {
    expect(problems.length).toBeGreaterThan(0);
  });

  for (const p of problems) {
    const template = getTemplate(p.topic);
    if (!template) continue; // テンプレ未登録の手起こし問題はスキップ

    it(`${p.id}（${p.topic}）の answer/choices がテンプレ計算と一致`, () => {
      const numericParams = Object.fromEntries(
        Object.entries(p.params ?? {}).map(([k, v]) => [k, v.value]),
      );
      const g = template.generateFrom(numericParams);
      expect(g, `${p.id}: generateFrom が null（params が綺麗な解を生まない）`).not.toBeNull();
      expect(g!.answerText).toBe(p.answer);
      if (p.format === "multiple_choice") {
        expect(g!.choices).toEqual(p.choices);
      }
    });
  }
});
