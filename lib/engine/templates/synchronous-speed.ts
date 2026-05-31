/**
 * テンプレート: 同期機の同期速度。
 *
 * 閉形式: N_s = 120·f / p   〔min⁻¹〕
 *   f=周波数[Hz], p=極数。
 *
 * 誤答（成立する典型ミス）:
 *   ① 係数取り違え   N_s' = 60·f/p
 *   ② 極対数で計算   N_s' = 120·f/(p/2)  = 240f/p
 *   ③ 乗除取り違え   N_s' = 120·f·p
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const F_SET: ReadonlyArray<number> = [50, 60];
const P_SET: ReadonlyArray<number> = [2, 4, 6, 8, 10, 12];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(f: number, p: number): GenerationResult | null {
  if (f <= 0 || p <= 0 || p % 2 !== 0) return null; // 極数は偶数
  const Ns = (120 * f) / p; // 正解
  const half = (60 * f) / p; // ① 係数 120→60 取り違え
  const polePair = (240 * f) / p; // ② 極数でなく極対数 p/2 で割った
  // ③ 50/60Hz を取り違え（機能する誤答。荒唐無稽な 120·f·p は採用しない: 13/14-best-practices §誤答妥当性）
  const wrongFreq = (120 * (f === 50 ? 60 : 50)) / p;

  const vals = [Ns, half, polePair, wrongFreq];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(Ns);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      frequency: { value: f, unit: "Hz", realistic_range: [50, 60] },
      poles: { value: p, unit: "pole", realistic_range: [2, 12] },
    },
    answerValue: Ns,
    answerUnit: "min^-1",
    answerText,
    choices,
    distractors: [
      { text: formatClean(half), reason: "係数 120 を 60 と取り違えた" },
      { text: formatClean(polePair), reason: "極数 p でなく極対数 p/2 で割った" },
      { text: formatClean(wrongFreq), reason: `周波数を ${f === 50 ? 60 : 50}Hz と取り違えた` },
    ],
    likelyWrongChoice: formatClean(half),
    facts: { f, p, Ns },
    defaultStatement: `周波数 ${f}Hz、極数 ${p} の同期発電機の同期速度 N_s〔min⁻¹〕は?`,
    defaultSolution: [`N_s = 120·f/p = 120×${f}/${p}`, `N_s = ${answerText} min⁻¹`],
    physicallyValid: true,
  };
}

export const synchronousSpeed: Template = {
  topic: "同期速度",
  subject: "機械",
  exam: "denken3",
  difficulty: 1,
  meta: {
    tags: ["機械", "同期機", "同期速度", "極数"],
    formulas: ["N_s = 120f/p 〔min⁻¹〕"],
    learningObjectives: ["周波数と極数から同期速度を求められる"],
    hints: ["係数は 120", "極数 p で割る（極対数ではない）", "50Hz/4極なら 1500 min⁻¹"],
    prerequisites: ["交流の周波数"],
    relatedTopics: ["誘導電動機の回転速度", "同期発電機の出力"],
    estimatedTimeSec: 60,
  },
  paramSpecs: {
    frequency: { unit: "Hz", realistic_range: [50, 60] },
    poles: { unit: "pole", realistic_range: [2, 12] },
  },
  generate(rng) {
    const f = pick(F_SET, rng);
    const p = pick(P_SET, rng);
    return buildFrom(f, p);
  },
  generateFrom(params) {
    const { frequency, poles } = params;
    if (frequency === undefined || poles === undefined) return null;
    return buildFrom(frequency, poles);
  },
};
