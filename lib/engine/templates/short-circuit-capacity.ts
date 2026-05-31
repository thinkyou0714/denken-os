/**
 * テンプレート: 三相短絡容量（基準容量法）。電験二種二次「電力・管理」想定。
 *
 * 閉形式: P_s = P_n × 100 / %Z   〔MV·A〕
 *   P_n=基準容量[MV·A], %Z=基準容量換算の百分率インピーダンス[%]。
 *
 * descriptive 形式（自動採点せず、模範解答＋採点観点を提示して自己採点）。
 * 正解値はコードで算出する（二次でもハルシネーション対策は同じ）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const PN_SET: ReadonlyArray<number> = [10, 20, 30, 50, 100]; // MV·A
const PZ_SET: ReadonlyArray<number> = [4, 5, 8, 10, 20, 25]; // %

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Pn: number, pz: number): GenerationResult | null {
  if (Pn <= 0 || pz <= 0) return null;
  const Ps = (Pn * 100) / pz; // 正解 [MV·A]
  if (!isCleanAnswer(Ps)) return null;
  const answerText = formatClean(Ps);

  return {
    format: "descriptive",
    params: {
      base_capacity: { value: Pn, unit: "MVA", realistic_range: [1, 1000] },
      percent_impedance: { value: pz, unit: "%", realistic_range: [1, 50] },
    },
    answerValue: Ps,
    answerUnit: "MVA",
    answerText,
    facts: { Pn, pz, Ps },
    defaultStatement:
      `基準容量 ${Pn}MV·A、その基準でのパーセントインピーダンスが %Z=${pz}% の系統がある。` +
      `この点における三相短絡容量 P_s〔MV·A〕を、導出過程とともに求めよ。`,
    defaultSolution: [
      `短絡容量は基準容量と %Z の関係 P_s = P_n × 100/%Z で表される`,
      `P_s = ${Pn} × 100/${pz}`,
      `P_s = ${answerText} MV·A`,
      `（短絡電流は I_s = P_s/(√3·V) で換算できる）`,
    ],
    physicallyValid: true,
  };
}

export const shortCircuitCapacity: Template = {
  topic: "三相短絡容量",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  meta: {
    tags: ["電力管理", "二次試験", "短絡容量", "パーセントインピーダンス", "故障計算"],
    formulas: ["P_s = P_n × 100/%Z 〔MV·A〕", "I_s = P_s/(√3·V)"],
    learningObjectives: ["基準容量法で短絡容量を求め、%Z の基準容量換算の意味を説明できる"],
    hints: ["%Z は基準容量に対する値", "短絡容量は基準容量を %Z/100 で割る", "電流換算は √3V で割る"],
    prerequisites: ["パーセントインピーダンスと短絡電流", "三相交流電力"],
    relatedTopics: ["%インピーダンスの基準容量換算", "遮断容量", "対称座標法"],
    gradingPoints: [
      "短絡容量 P_s = P_n×100/%Z を正しく立式している（5点）",
      "数値代入と計算が正しい（3点）",
      "単位 MV·A を明記している（1点）",
      "短絡電流への換算 I_s=P_s/(√3·V) に言及している（1点・加点）",
    ],
    references: [{ label: "発変電所の保護・短絡電流計算", article: "電力・管理（二次）頻出テーマ" }],
    estimatedTimeSec: 600,
  },
  paramSpecs: {
    base_capacity: { unit: "MVA", realistic_range: [1, 1000] },
    percent_impedance: { unit: "%", realistic_range: [1, 50] },
  },
  generate(rng) {
    const Pn = pick(PN_SET, rng);
    const pz = pick(PZ_SET, rng);
    return buildFrom(Pn, pz);
  },
  generateFrom(params) {
    const { base_capacity, percent_impedance } = params;
    if (base_capacity === undefined || percent_impedance === undefined) return null;
    return buildFrom(base_capacity, percent_impedance);
  },
};
