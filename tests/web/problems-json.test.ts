/**
 * web/problems.json（オフライン学習アプリのデモ問題）の品質と鮮度を担保する。
 *
 * 根本対策: 以前は手動コミットの一度きり生成物で、テンプレ拡充が反映されず
 * 恒久ドリフトしていた。ここで「コミット済みファイル == 決定論再生成」を要求し、
 * テンプレ変更後に npm run gen:web を忘れると CI で落ちるようにする。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { subjectEnum } from "../../lib/engine/schema.js";
import { getTemplate, listTopics } from "../../lib/engine/templates/index.js";
import { validateProblem } from "../../lib/engine/validate.js";
import { buildProblems } from "../../scripts/build-problems.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "../../web/problems.json");

const committed = JSON.parse(readFileSync(FILE, "utf8"));

describe("web/problems.json 品質・鮮度", () => {
  it("コミット済みファイルが決定論再生成と一致する（gen:web 忘れ検知）", async () => {
    const regenerated = await buildProblems();
    expect(committed).toEqual(JSON.parse(JSON.stringify(regenerated)));
  });

  it("全6科目を網羅する（拡充がアプリに届いている）", () => {
    const subjects = new Set(committed.map((p: { subject: string }) => p.subject));
    for (const s of subjectEnum.options) {
      expect(subjects.has(s), `web デモに科目「${s}」が無い`).toBe(true);
    }
  });

  it("各問が検証を通り、answer∈choices かつテンプレ計算と一致する", () => {
    expect(committed.length).toBeGreaterThan(0);
    for (const p of committed) {
      expect(validateProblem(p).ok, `${p.id} が検証に失敗`).toBe(true);
      if (p.format === "multiple_choice") {
        expect(p.choices).toContain(p.answer);
      }
      const template = getTemplate(p.topic);
      expect(template, `${p.id}: topic「${p.topic}」のテンプレが無い`).toBeDefined();
      const numericParams = Object.fromEntries(
        Object.entries(p.params ?? {}).map(([k, v]) => [k, (v as { value: number }).value]),
      );
      const g = template!.generateFrom(numericParams);
      expect(g!.answerText).toBe(p.answer);
    }
  });

  it("登録テンプレ全 topic がデモに含まれる", () => {
    const topics = new Set(committed.map((p: { topic: string }) => p.topic));
    for (const t of listTopics()) {
      expect(topics.has(t), `web デモに topic「${t}」が無い`).toBe(true);
    }
  });
});
