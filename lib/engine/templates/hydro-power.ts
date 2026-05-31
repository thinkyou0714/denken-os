/**
 * テンプレート: 水力発電所の理論／発電出力。
 *
 * 閉形式: P = 9.8 · Q · H · η   〔kW〕
 *   Q=流量[m³/s], H=有効落差[m], η=総合効率。
 *
 * 誤答（成立する典型ミス）:
 *   ① 効率の掛け忘れ   P' = 9.8·Q·H
 *   ② 9.8 の付け忘れ   P' = Q·H·η
 *   ③ 効率で割る       P' = 9.8·Q·H/η
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
  if (Q <= 0 || H <= 0 || eta <= 0 || eta > 1) return null;
  const P = G * Q * H * eta; // 正解
  const noEta = G * Q * H; // ①
  const noG = Q * H * eta; // ②
  const divEta = (G * Q * H) / eta; // ③

  const vals = [P, noEta, noG, divEta];
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
      { text: formatClean(noEta), reason: "総合効率 η の掛け忘れ" },
      { text: formatClean(noG), reason: "重力加速度 9.8 の付け忘れ" },
      { text: formatClean(divEta), reason: "効率を掛けるべきところを割った" },
    ],
    likelyWrongChoice: formatClean(noEta),
    facts: { Q, H, eta, P },
    defaultStatement:
      `有効落差 ${H}m、使用水量 ${Q}m³/s、総合効率 ${eta} の水力発電所の発電出力 P〔kW〕は? ` + `（P=9.8·Q·H·η）`,
    defaultSolution: [`P = 9.8·Q·H·η`, `= 9.8 × ${Q} × ${H} × ${eta}`, `P = ${answerText} kW`],
    physicallyValid: true,
  };
}

export const hydroPower: Template = {
  topic: "水力発電の出力",
  subject: "電力",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["電力", "発電", "水力発電", "効率"],
    formulas: ["P = 9.8·Q·H·η 〔kW〕"],
    learningObjectives: ["水力発電の理論出力を流量・落差・効率から計算できる"],
    hints: ["位置エネルギー P=ρgQH の ρg≒9.8", "効率 η を最後に掛ける", "単位は kW"],
    prerequisites: ["エネルギーと仕事"],
    relatedTopics: ["揚水発電の効率", "火力発電の熱効率"],
    estimatedTimeSec: 120,
  },
  paramSpecs: {
    flow: { unit: "m3/s", realistic_range: [1, 100] },
    head: { unit: "m", realistic_range: [5, 500] },
    efficiency: { unit: "", realistic_range: [0.7, 0.95] },
  },
  generate(rng) {
    const Q = pick(Q_SET, rng);
    const H = pick(H_SET, rng);
    const eta = pick(ETA_SET, rng);
    return buildFrom(Q, H, eta);
  },
  generateFrom(params) {
    const { flow, head, efficiency } = params;
    if (flow === undefined || head === undefined || efficiency === undefined) return null;
    return buildFrom(flow, head, efficiency);
  },
};
