/**
 * テンプレート: ホイートストンブリッジの平衡（理論・numeric）。
 *   平衡条件 R1·Rx = R2·R3  ⇒  Rx = R2·R3 / R1  〔Ω〕
 *   （検流計に電流が流れない＝対辺の積が等しい）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { wheatstoneFigure } from "../figures/index.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const R1_SET: ReadonlyArray<number> = [10, 20, 50, 100, 200];
const R2_SET: ReadonlyArray<number> = [100, 150, 200, 300, 400, 500];
const R3_SET: ReadonlyArray<number> = [100, 200, 300, 400, 600];

function buildFrom(R1: number, R2: number, R3: number): GenerationResult | null {
  if (R1 <= 0 || R2 <= 0 || R3 <= 0) return null;
  const Rx = (R2 * R3) / R1;
  if (!isCleanAnswer(Rx) || Rx > 100000) return null;
  const answerText = formatClean(Rx);

  return {
    format: "numeric",
    params: {
      r1: { value: R1, unit: "ohm", realistic_range: [10, 200] },
      r2: { value: R2, unit: "ohm", realistic_range: [100, 500] },
      r3: { value: R3, unit: "ohm", realistic_range: [100, 600] },
    },
    answerValue: Rx,
    answerUnit: "ohm",
    answerText,
    facts: { R1, R2, R3, Rx },
    defaultStatement:
      `ホイートストンブリッジが平衡している。辺の抵抗が R1=${R1}Ω、R2=${R2}Ω、R3=${R3}Ω のとき、` +
      `未知抵抗 Rx〔Ω〕は?（R1 と Rx、R2 と R3 がそれぞれ対辺）`,
    defaultSolution: [`平衡条件: 対辺の積が等しい R1·Rx=R2·R3`, `Rx=R2·R3/R1=${R2}×${R3}/${R1}`, `Rx=${answerText}Ω`],
    figure: wheatstoneFigure(R1, R2, R3, Rx),
    physicallyValid: true,
  };
}

export const wheatstoneBridge: Template = {
  topic: "ホイートストンブリッジ",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: {
    r1: { unit: "ohm", realistic_range: [10, 200] },
    r2: { unit: "ohm", realistic_range: [100, 500] },
    r3: { unit: "ohm", realistic_range: [100, 600] },
  },
  generate(rng) {
    return buildFrom(pick(R1_SET, rng), pick(R2_SET, rng), pick(R3_SET, rng));
  },
  generateFrom(params) {
    const { r1, r2, r3 } = params;
    if (r1 === undefined || r2 === undefined || r3 === undefined) return null;
    return buildFrom(r1, r2, r3);
  },
};
