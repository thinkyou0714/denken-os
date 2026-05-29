/**
 * テンプレート: 変圧器の巻数比と二次電圧（機械・multiple_choice 形式）。
 *   a = N1/N2 = V1/V2  →  V2 = V1·N2/N1 〔V〕
 * 正解はコードで算出。誤答は典型ミス（比を逆数・巻数比の取り違え・一次電圧そのまま）。
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const V1_SET = [3300, 6600, 200, 400, 100];
// 巻数比 (N1, N2) が割り切れる組。
const TURNS: ReadonlyArray<readonly [number, number]> = [
  [33, 1],
  [66, 1],
  [2, 1],
  [4, 1],
  [33, 2],
  [3, 1],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function fmt(v: number): string {
  return String(Number(v.toFixed(2)));
}

function buildFrom(V1: number, N1: number, N2: number): GenerationResult | null {
  if (V1 <= 0 || N1 <= 0 || N2 <= 0) return null;
  const V2 = (V1 * N2) / N1; // 正解
  const inverted = (V1 * N1) / N2; // 比を逆に
  const sameV1 = V1; // 一次電圧のまま（変換忘れ）
  const ratioOnly = N1 / N2; // 巻数比そのものを答えた

  const vals = [V2, inverted, sameV1, ratioOnly];
  if (!vals.every((v) => v > 0 && isCleanAnswer(v))) return null;
  const texts = new Set(vals.map(fmt));
  if (texts.size !== 4) return null;

  const answerText = fmt(V2);
  const choices = [...texts].sort((a, b) => Number(a) - Number(b));

  return {
    difficulty: V1 >= 3300 ? 2 : 1,
    params: {
      primary_voltage: { value: V1, unit: "V", realistic_range: [100, 6600] },
      n1: { value: N1, unit: "turn", realistic_range: [1, 100] },
      n2: { value: N2, unit: "turn", realistic_range: [1, 100] },
    },
    answerValue: V2,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: fmt(inverted), reason: "巻数比を逆に適用（V1·N1/N2）" },
      { text: fmt(sameV1), reason: "二次へ変換せず一次電圧のまま" },
      { text: fmt(ratioOnly), reason: "巻数比 N1/N2 そのものを電圧と誤答" },
    ],
    likelyWrongChoice: fmt(inverted),
    facts: { V1, N1, N2, V2 },
    defaultStatement: `一次巻数${N1}、二次巻数${N2}の変圧器の一次に${V1}Vを加えた。二次電圧V2〔V〕は?（理想変圧器）`,
    defaultSolution: ["巻数比 a=N1/N2=V1/V2 より V2=V1·N2/N1", `V2 = ${V1}×${N2}/${N1}`, `V2 = ${answerText} V`],
    physicallyValid: true,
  };
}

export const transformerTurnsRatio: Template = {
  topic: "変圧器の巻数比と二次電圧",
  subject: "機械",
  exam: "denken3",
  difficulty: 1,
  paramSpecs: {
    primary_voltage: { unit: "V", realistic_range: [100, 6600] },
    n1: { unit: "turn", realistic_range: [1, 100] },
    n2: { unit: "turn", realistic_range: [1, 100] },
  },
  generate(rng) {
    const [n1, n2] = pick(TURNS, rng);
    return buildFrom(pick(V1_SET, rng), n1, n2);
  },
  generateFrom(params) {
    const { primary_voltage, n1, n2 } = params;
    if (primary_voltage === undefined || n1 === undefined || n2 === undefined) return null;
    return buildFrom(primary_voltage, n1, n2);
  },
};
