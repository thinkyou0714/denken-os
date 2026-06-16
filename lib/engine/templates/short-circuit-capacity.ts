/**
 * テンプレート: 三相短絡容量（二種二次・電力管理・descriptive）。
 *   短絡容量  Ps = P_base × 100 / %Z   〔MVA〕
 *     P_base=基準容量, %Z=基準容量におけるパーセントインピーダンス
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const BASE_SET: ReadonlyArray<number> = [10, 20, 50, 100];
const PZ_SET: ReadonlyArray<number> = [4, 5, 8, 10, 12.5, 20, 25];

type Params = {
  base_capacity: number;
  percent_impedance: number;
};

export const shortCircuitCapacity = defineTemplate<Params>({
  topic: "三相短絡容量",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  pastExam: { area: "短絡・故障計算", frequency: "high", years: [2006, 2011, 2016, 2021] },
  paramSpecs: {
    base_capacity: { unit: "MVA", realistic_range: [10, 100] },
    percent_impedance: { unit: "%", realistic_range: [4, 25] },
  },
  paramOrder: ["base_capacity", "percent_impedance"],
  draw(rng) {
    return {
      base_capacity: pick(BASE_SET, rng),
      percent_impedance: pick(PZ_SET, rng),
    };
  },
  buildFrom({ base_capacity: base, percent_impedance: pz }) {
    if (base <= 0 || pz <= 0) return null;
    const Ps = (base * 100) / pz;
    if (!isCleanAnswer(Ps)) return null;
    const answerText = formatClean(Ps);
    return {
      format: "descriptive",
      params: {
        base_capacity: { value: base, unit: "MVA", realistic_range: [10, 100] },
        percent_impedance: { value: pz, unit: "%", realistic_range: [4, 25] },
      },
      answerValue: Ps,
      answerUnit: "MVA",
      answerText,
      facts: { base, pz, Ps },
      defaultStatement:
        `基準容量 P_base=${base}MVA における系統のパーセントインピーダンスが %Z=${pz}% である。` +
        `この点での三相短絡容量 Ps〔MVA〕を導出過程とともに求めよ。`,
      defaultSolution: [`短絡容量 Ps=P_base×100/%Z`, `Ps=${base}×100/${pz}`, `Ps=${answerText}MVA`],
      physicallyValid: true,
    };
  },
});
