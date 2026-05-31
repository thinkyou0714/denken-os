/**
 * テンプレート: ホイートストンブリッジの平衡条件。
 *
 * 平衡（検流計に電流が流れない）条件: R1·Rx = R2·R3
 *   ⇒ 未知抵抗 Rx = R2·R3 / R1   〔Ω〕
 *
 * 誤答（成立する典型ミス）:
 *   ① 対辺の取り違え   Rx' = R1·R3/R2
 *   ② 別の取り違え     Rx' = R1·R2/R3
 *   ③ 和で計算         Rx' = R2+R3−R1
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// R1·Rx=R2·R3 が綺麗になる (R1,R2,R3) の母集合。
const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [10, 20, 30],
  [20, 40, 30],
  [10, 30, 40],
  [5, 10, 20],
  [10, 50, 20],
  [20, 30, 40],
  [10, 40, 50],
  [25, 50, 100],
  [10, 60, 20],
  [15, 30, 20],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(R1: number, R2: number, R3: number): GenerationResult | null {
  if (R1 <= 0 || R2 <= 0 || R3 <= 0) return null;
  const Rx = (R2 * R3) / R1; // 正解
  const swap1 = (R1 * R3) / R2; // ①
  const swap2 = (R1 * R2) / R3; // ②
  const sum = R2 + R3 - R1; // ③

  const vals = [Rx, swap1, swap2, sum];
  if (!vals.every((v) => v > 0 && isCleanAnswer(v))) return null;
  const answerText = formatClean(Rx);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      R1: { value: R1, unit: "ohm", realistic_range: [1, 1000] },
      R2: { value: R2, unit: "ohm", realistic_range: [1, 1000] },
      R3: { value: R3, unit: "ohm", realistic_range: [1, 1000] },
    },
    answerValue: Rx,
    answerUnit: "ohm",
    answerText,
    choices,
    distractors: [
      { text: formatClean(swap1), reason: "平衡条件の対辺を取り違え R1·R3/R2 とした" },
      { text: formatClean(swap2), reason: "平衡条件の対辺を取り違え R1·R2/R3 とした" },
      { text: formatClean(sum), reason: "積でなく和差で計算した（平衡条件は積の関係）" },
    ],
    likelyWrongChoice: formatClean(swap1),
    facts: { R1, R2, R3, Rx },
    defaultStatement:
      `ホイートストンブリッジが平衡している。各辺の抵抗が R1=${R1}Ω, R2=${R2}Ω, R3=${R3}Ω のとき、` +
      `R1 と直列をなす辺の未知抵抗 Rx〔Ω〕は? （平衡条件 R1·Rx=R2·R3）`,
    defaultSolution: [`平衡条件: R1·Rx = R2·R3`, `Rx = R2·R3/R1 = ${R2}·${R3}/${R1}`, `Rx = ${answerText} Ω`],
    physicallyValid: true,
  };
}

export const wheatstoneBridge: Template = {
  topic: "ブリッジ回路の平衡条件",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["理論", "直流回路", "ブリッジ", "平衡条件"],
    formulas: ["R1·Rx = R2·R3", "Rx = R2·R3/R1"],
    learningObjectives: ["ブリッジの平衡条件（対辺の積が等しい）を使って未知抵抗を求められる"],
    hints: ["平衡時は検流計に電流が流れない", "対辺どうしの積が等しい: R1·Rx=R2·R3"],
    prerequisites: ["分圧の法則", "キルヒホッフの法則"],
    relatedTopics: ["分圧の法則", "直並列合成抵抗"],
    estimatedTimeSec: 120,
  },
  paramSpecs: {
    R1: { unit: "ohm", realistic_range: [1, 1000] },
    R2: { unit: "ohm", realistic_range: [1, 1000] },
    R3: { unit: "ohm", realistic_range: [1, 1000] },
  },
  generate(rng) {
    const [R1, R2, R3] = pick(TRIPLES, rng);
    return buildFrom(R1, R2, R3);
  },
  generateFrom(params) {
    const { R1, R2, R3 } = params;
    if (R1 === undefined || R2 === undefined || R3 === undefined) return null;
    return buildFrom(R1, R2, R3);
  },
};
