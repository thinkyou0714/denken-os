/**
 * テンプレート: %インピーダンスからの三相短絡電流。
 *
 * 閉形式: I_s = I_n × 100 / %Z   〔A〕
 *   I_n=定格電流, %Z=パーセントインピーダンス[%]。
 *
 * 誤答（成立する典型ミス）:
 *   ① 逆数の取り違え   I_s' = I_n·%Z/100
 *   ② 100 の付け忘れ   I_s' = I_n/%Z
 *   ③ %Z を無視        I_s' = I_n（定格電流のまま）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const IN_SET: ReadonlyArray<number> = [10, 20, 50, 100, 200, 500, 1000];
const PZ_SET: ReadonlyArray<number> = [4, 5, 8, 10, 16, 20, 25];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(In: number, pz: number): GenerationResult | null {
  if (In <= 0 || pz <= 0) return null;
  const Is = (In * 100) / pz; // 正解
  const inverted = (In * pz) / 100; // ①
  const noHundred = In / pz; // ②
  const ignore = In; // ③

  const vals = [Is, inverted, noHundred, ignore];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(Is);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      rated_current: { value: In, unit: "A", realistic_range: [1, 5000] },
      percent_impedance: { value: pz, unit: "%", realistic_range: [1, 50] },
    },
    answerValue: Is,
    answerUnit: "A",
    answerText,
    choices,
    distractors: [
      { text: formatClean(inverted), reason: "%Z を逆数で扱い I_n·%Z/100 とした" },
      { text: formatClean(noHundred), reason: "100 の付け忘れ（%Z は百分率）" },
      { text: formatClean(ignore), reason: "%Z を無視し定格電流のままとした" },
    ],
    likelyWrongChoice: formatClean(inverted),
    facts: { In, pz, Is },
    defaultStatement:
      `定格電流 ${In}A、パーセントインピーダンス %Z=${pz}% の系統で三相短絡が起きた。` + `短絡電流 I_s〔A〕は?`,
    defaultSolution: [`I_s = I_n × 100/%Z`, `= ${In} × 100/${pz}`, `I_s = ${answerText} A`],
    physicallyValid: true,
  };
}

export const percentImpedanceShortCircuit: Template = {
  topic: "パーセントインピーダンスと短絡電流",
  subject: "電力",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["電力", "送配電", "短絡電流", "パーセントインピーダンス"],
    formulas: ["I_s = I_n×100/%Z", "短絡容量 P_s = P_n×100/%Z"],
    learningObjectives: ["%Z から短絡電流・短絡容量を求められ、丸暗記でなく意味を説明できる"],
    hints: ["%Z は定格時の電圧降下割合", "%Z が小さいほど短絡電流は大きい", "I_s = I_n×100/%Z"],
    prerequisites: ["三相交流電力", "オームの法則"],
    relatedTopics: ["短絡容量", "遮断容量"],
    estimatedTimeSec: 150,
  },
  paramSpecs: {
    rated_current: { unit: "A", realistic_range: [1, 5000] },
    percent_impedance: { unit: "%", realistic_range: [1, 50] },
  },
  generate(rng) {
    const In = pick(IN_SET, rng);
    const pz = pick(PZ_SET, rng);
    return buildFrom(In, pz);
  },
  generateFrom(params) {
    const { rated_current, percent_impedance } = params;
    if (rated_current === undefined || percent_impedance === undefined) return null;
    return buildFrom(rated_current, percent_impedance);
  },
};
