/**
 * テンプレート: 水力発電所の出力（二種二次・電力管理・descriptive）。
 *   発電機出力  P = 9.8·Q·H·η   〔kW〕
 *     Q=流量〔m³/s〕, H=有効落差〔m〕, η=総合効率
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const Q_SET: ReadonlyArray<number> = [5, 10, 15, 20, 25, 30, 40, 50];
const H_SET: ReadonlyArray<number> = [20, 50, 80, 100, 120, 150, 200];
const ETA_SET: ReadonlyArray<number> = [0.85, 0.9];

type Params = {
  flow: number;
  head: number;
  efficiency: number;
};

export const hydroPowerOutput = defineTemplate<Params>({
  topic: "水力発電出力",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  paramSpecs: {
    flow: { unit: "m3/s", realistic_range: [5, 50] },
    head: { unit: "m", realistic_range: [20, 200] },
    efficiency: { unit: "", realistic_range: [0.8, 0.95] },
  },
  paramOrder: ["flow", "head", "efficiency"],
  draw(rng) {
    return {
      flow: pick(Q_SET, rng),
      head: pick(H_SET, rng),
      efficiency: pick(ETA_SET, rng),
    };
  },
  buildFrom({ flow: Q, head: H, efficiency: eta }) {
    if (Q <= 0 || H <= 0 || eta <= 0 || eta > 1) return null;
    const P = 9.8 * Q * H * eta;
    if (!isCleanAnswer(P)) return null;
    const answerText = formatClean(P);
    return {
      format: "descriptive",
      params: {
        flow: { value: Q, unit: "m3/s", realistic_range: [5, 50] },
        head: { value: H, unit: "m", realistic_range: [20, 200] },
        efficiency: { value: eta, unit: "", realistic_range: [0.8, 0.95] },
      },
      answerValue: P,
      answerUnit: "kW",
      answerText,
      facts: { Q, H, eta, P },
      defaultStatement:
        `有効落差 H=${H}m、使用流量 Q=${Q}m³/s、総合効率 η=${eta} の水力発電所がある。` +
        `発電機出力 P〔kW〕を P=9.8QHη により導出過程とともに求めよ。`,
      defaultSolution: [
        `出力 P=9.8·Q·H·η〔kW〕（9.8=重力加速度に基づく係数）`,
        `P=9.8×${Q}×${H}×${eta}`,
        `P=${answerText}kW`,
      ],
      physicallyValid: true,
    };
  },
});
