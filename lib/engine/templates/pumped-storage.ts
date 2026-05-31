/**
 * テンプレート: 揚水発電の揚水所要電力（ポンプ効率）。
 *
 * 閉形式: P = 9.8·Q·H/η   〔kW〕   （η=ポンプ電動機効率。揚水は効率で『割る』）
 *
 * 誤答（成立する典型ミス）:
 *   ① 9.8·Q·H     効率 η を無視した（割らなかった）
 *   ② 9.8·Q·H·η   効率を割るべきところ掛けた（発電出力と混同）
 *   ③ Q·H/η       9.8(ρg) を付け忘れた
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const G = 9.8;
const Q_SET: ReadonlyArray<number> = [5, 10, 15, 20, 25, 40];
const H_SET: ReadonlyArray<number> = [10, 20, 30, 50, 100, 200];
const ETA_SET: ReadonlyArray<number> = [0.8, 0.85, 0.9];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Q: number, H: number, eta: number): GenerationResult | null {
  if (Q <= 0 || H <= 0 || eta <= 0 || eta >= 1) return null;
  const P = (G * Q * H) / eta; // 正解（揚水入力）
  const noEta = G * Q * H; // ①
  const mulEta = G * Q * H * eta; // ②
  const noG = (Q * H) / eta; // ③

  const vals = [P, noEta, mulEta, noG];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(P);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      flow: { value: Q, unit: "m3/s", realistic_range: [1, 100] },
      head: { value: H, unit: "m", realistic_range: [5, 500] },
      efficiency: { value: eta, unit: "", realistic_range: [0.7, 0.95] },
    },
    answerValue: P,
    answerUnit: "kW",
    answerText,
    choices,
    distractors: [
      { text: formatClean(noEta), reason: "ポンプ効率 η を無視した（割らなかった）" },
      { text: formatClean(mulEta), reason: "効率で割るべきところを掛けた（発電出力と混同）" },
      { text: formatClean(noG), reason: "重力加速度 9.8（ρg）を付け忘れた" },
    ],
    likelyWrongChoice: formatClean(noEta),
    facts: { Q, H, eta, P },
    defaultStatement:
      `有効揚程 ${H}m、揚水量 ${Q}m³/s、ポンプ電動機効率 ${eta} で揚水するとき、揚水に必要な電力 P〔kW〕は?` +
      ` （P=9.8·Q·H/η）`,
    defaultSolution: [
      `揚水入力は理論水動力を効率で割る P = 9.8·Q·H/η`,
      `= 9.8 × ${Q} × ${H} / ${eta}`,
      `P = ${answerText} kW`,
    ],
    physicallyValid: true,
  };
}

export const pumpedStorage: Template = {
  topic: "揚水発電の効率",
  subject: "電力",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["電力", "発電", "揚水発電", "効率"],
    formulas: ["揚水入力 P = 9.8·Q·H/η 〔kW〕", "発電出力 P = 9.8·Q·H·η"],
    learningObjectives: ["揚水（入力）は効率で割り、発電（出力）は効率を掛けることを区別できる"],
    hints: ["揚水は『余計に』電力が要る→効率で割る", "発電出力は効率を掛ける", "9.8 を忘れない"],
    prerequisites: ["水力発電の出力"],
    relatedTopics: ["水力発電の出力", "火力発電の熱効率"],
    estimatedTimeSec: 120,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    flow: { unit: "m3/s", realistic_range: [1, 100] },
    head: { unit: "m", realistic_range: [5, 500] },
    efficiency: { unit: "", realistic_range: [0.7, 0.95] },
  },
  generate(rng) {
    return buildFrom(pick(Q_SET, rng), pick(H_SET, rng), pick(ETA_SET, rng));
  },
  generateFrom(params) {
    const { flow, head, efficiency } = params;
    if (flow === undefined || head === undefined || efficiency === undefined) return null;
    return buildFrom(flow, head, efficiency);
  },
};
