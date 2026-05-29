import { describe, expect, it } from "vitest";
import { audioScriptToPlainText, buildPlaylist, toAudioScript } from "../../lib/audio/script.js";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import type { Problem } from "../../lib/engine/schema.js";
import { insulationResistance, threePhasePower } from "../../lib/engine/templates/index.js";

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

async function one(template: typeof threePhasePower, seed: number): Promise<Problem> {
  const [p] = await generate(template, { count: 1, narrator: new StubNarrator(), rng: seededRng(seed) });
  return p!;
}

describe("toAudioScript — 聞き流し台本", () => {
  it("numeric(法規)は intro→question→gap→answer→explanation の順（選択肢なし）", async () => {
    const p = await one(insulationResistance, 1);
    const script = toAudioScript(p, { gapMs: 5000 });
    const kinds = script.segments.map((s) => s.kind);
    expect(kinds).toEqual(["intro", "question", "gap", "answer", "explanation"]);
    const gap = script.segments.find((s) => s.kind === "gap")!;
    expect(gap.pauseMsAfter).toBe(5000);
    expect(script.segments[0]!.text).toContain(p.topic);
    expect(script.segments.find((s) => s.kind === "answer")!.text).toContain(p.answer);
  });

  it("multiple_choice は choices 区間を含み番号読みになる", async () => {
    const p = await one(threePhasePower, 2);
    const script = toAudioScript(p);
    const choices = script.segments.find((s) => s.kind === "choices");
    expect(choices).toBeDefined();
    expect(choices!.text).toContain("1ばん");
  });

  it("includeSource/includeExplanation を制御できる", async () => {
    const p = await one(insulationResistance, 3);
    const script = toAudioScript(p, { includeExplanation: false, includeSource: true });
    const kinds = script.segments.map((s) => s.kind);
    expect(kinds).not.toContain("explanation");
    expect(kinds).toContain("source");
  });

  it("台本テキストに未変換の単位記号が残らない（読み上げ品質）", async () => {
    const p = await one(threePhasePower, 4);
    const text = audioScriptToPlainText(toAudioScript(p));
    expect(text).not.toMatch(/[〔〕Ω]/);
  });
});

describe("buildPlaylist — 再生順の構築", () => {
  const mk = (id: string, subject: Problem["subject"], topic: string): Problem =>
    ({
      id,
      subject,
      topic,
      difficulty: 1,
      statement: "x",
      answer: "1",
      solution: ["1"],
      validation: { solver_checked: true, human_checked: true, clean_answer: true, physically_valid: true },
      source: { type: "original", citation: "t" },
    }) as Problem;

  const pool = [mk("a", "法規", "B種接地抵抗"), mk("b", "理論", "三相交流電力"), mk("c", "法規", "低圧電路の絶縁抵抗")];

  it("科目で絞り込む", () => {
    const list = buildPlaylist(pool, { subjects: ["法規"] });
    expect(list.map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("弱点 topic を前方へ寄せる", () => {
    const list = buildPlaylist(pool, { subjects: ["法規"], weakTopics: ["低圧電路の絶縁抵抗"] });
    expect(list[0]!.id).toBe("c");
  });

  it("科目未指定なら全件返す", () => {
    expect(buildPlaylist(pool).length).toBe(3);
  });
});
