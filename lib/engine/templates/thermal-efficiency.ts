/**
 * テンプレート: 火力発電所の総合熱効率（段階効率の積）。
 *
 * 閉形式: η = η_ボイラ × η_タービン × η_発電機   〔%〕
 *
 * 誤答（成立する典型ミス）:
 *   ① η_b×η_t        発電機効率を掛け忘れた
 *   ② η_t×η_g        ボイラ効率を掛け忘れた
 *   ③ η_b×η_g        タービン効率を掛け忘れた
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [η_b, η_t, η_g]。3 つの積と 3 つの 2 因子積が綺麗(2桁%以内)かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [0.9, 0.5, 0.96],
  [0.88, 0.45, 0.95],
  [0.9, 0.4, 0.95],
  [0.85, 0.5, 0.96],
  [0.9, 0.45, 0.96],
  [0.88, 0.5, 0.95],
  [0.85, 0.45, 0.96],
  [0.9, 0.5, 0.9],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

const pct = (x: number) => Math.round(x * 1e4) / 1e2; // 小数→% を 2 桁に丸める

function buildFrom(eb: number, et: number, eg: number): GenerationResult | null {
  if ([eb, et, eg].some((e) => e <= 0 || e > 1)) return null;
  const eta = pct(eb * et * eg); // 正解 [%]
  const noGen = pct(eb * et); // ①
  const noBoiler = pct(et * eg); // ②
  const noTurbine = pct(eb * eg); // ③

  const vals = [eta, noGen, noBoiler, noTurbine];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(eta);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      boiler: { value: eb, unit: "", realistic_range: [0.8, 0.95] },
      turbine: { value: et, unit: "", realistic_range: [0.4, 0.55] },
      generator: { value: eg, unit: "", realistic_range: [0.9, 0.99] },
    },
    answerValue: eta,
    answerUnit: "%",
    answerText,
    choices,
    distractors: [
      { text: formatClean(noGen), reason: "発電機効率 η_g を掛け忘れた" },
      { text: formatClean(noBoiler), reason: "ボイラ効率 η_b を掛け忘れた" },
      { text: formatClean(noTurbine), reason: "タービン（熱サイクル）効率 η_t を掛け忘れた" },
    ],
    likelyWrongChoice: formatClean(noGen),
    facts: { eb, et, eg, eta },
    defaultStatement:
      `ある汽力発電所のボイラ効率 ${pct(eb)}%、タービン（熱サイクル）効率 ${pct(et)}%、発電機効率 ${pct(eg)}% である。` +
      `この発電所の総合熱効率 η〔%〕は?`,
    defaultSolution: [`総合効率は各段階効率の積 η = η_b × η_t × η_g`, `= ${eb} × ${et} × ${eg}`, `η = ${answerText} %`],
    physicallyValid: true,
  };
}

export const thermalEfficiency: Template = {
  topic: "火力発電の熱効率",
  subject: "電力",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["電力", "発電", "火力発電", "効率"],
    formulas: ["η = η_b × η_t × η_g", "η_t（熱サイクル効率）= 蒸気のもつ熱→機械出力"],
    learningObjectives: ["火力発電の総合効率が各段階効率の積であることを理解し計算できる"],
    hints: ["効率は『積』で連鎖する（足し算・平均ではない）", "ボイラ→タービン→発電機の3段", "単位は %"],
    prerequisites: ["効率の定義"],
    relatedTopics: ["水力発電の出力", "揚水発電の効率"],
    estimatedTimeSec: 120,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    boiler: { unit: "", realistic_range: [0.8, 0.95] },
    turbine: { unit: "", realistic_range: [0.4, 0.55] },
    generator: { unit: "", realistic_range: [0.9, 0.99] },
  },
  generate(rng) {
    const [eb, et, eg] = pick(SETS, rng);
    return buildFrom(eb, et, eg);
  },
  generateFrom(params) {
    const { boiler, turbine, generator } = params;
    if (boiler === undefined || turbine === undefined || generator === undefined) return null;
    return buildFrom(boiler, turbine, generator);
  },
};
