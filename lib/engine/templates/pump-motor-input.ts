/**
 * テンプレート: 揚水ポンプの電動機入力（機械・numeric）。
 *   電動機入力  P = 9.8·Q·H / η   〔kW〕
 *     Q=揚水量〔m³/s〕, H=全揚程〔m〕, η=ポンプ＋電動機の総合効率
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const Q_SET: ReadonlyArray<number> = [1, 2, 4, 5, 10];
const H_SET: ReadonlyArray<number> = [20, 50, 100, 150, 200];
const ETA_SET: ReadonlyArray<number> = [0.7, 0.8, 0.98];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Q: number, H: number, eta: number): GenerationResult | null {
  if (Q <= 0 || H <= 0 || eta <= 0 || eta > 1) return null;
  const P = (9.8 * Q * H) / eta;
  if (!isCleanAnswer(P)) return null;
  const answerText = formatClean(P);
  return {
    format: "numeric",
    params: {
      flow: { value: Q, unit: "m3/s", realistic_range: [1, 10] },
      head: { value: H, unit: "m", realistic_range: [20, 200] },
      efficiency: { value: eta, unit: "", realistic_range: [0.6, 1] },
    },
    answerValue: P,
    answerUnit: "kW",
    answerText,
    facts: { Q, H, eta, P },
    defaultStatement:
      `揚水量 Q=${Q}m³/s、全揚程 H=${H}m、総合効率 η=${eta} の揚水ポンプを駆動する。` +
      `電動機の入力 P〔kW〕を P=9.8QH/η により求めよ。`,
    defaultSolution: [
      `水動力 9.8QH を効率で割る（損失分だけ入力が増える）: P=9.8·Q·H/η`,
      `P=9.8×${Q}×${H}/${eta}`,
      `P=${answerText}kW`,
    ],
    physicallyValid: true,
  };
}

export const pumpMotorInput: Template = {
  topic: "揚水ポンプの電動機入力",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    flow: { unit: "m3/s", realistic_range: [1, 10] },
    head: { unit: "m", realistic_range: [20, 200] },
    efficiency: { unit: "", realistic_range: [0.6, 1] },
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
