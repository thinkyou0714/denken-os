/**
 * テンプレート: 同期発電機の短絡比（機械・numeric）。
 *   短絡比  Ks = 100 / %Zs
 *     %Zs = パーセント同期インピーダンス
 *   （Ks は単位法の同期インピーダンス Zs[p.u.] の逆数 = 1/(%Zs/100)）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const PZ_SET: ReadonlyArray<number> = [80, 100, 125, 160, 200, 250];

function buildFrom(pz: number): GenerationResult | null {
  if (pz <= 0) return null;
  const Ks = 100 / pz;
  if (!isCleanAnswer(Ks)) return null;
  const answerText = formatClean(Ks);

  return {
    format: "numeric",
    params: {
      percent_synchronous_impedance: {
        value: pz,
        unit: "%",
        realistic_range: [50, 300],
      },
    },
    answerValue: Ks,
    answerUnit: "",
    answerText,
    facts: { pz, Ks },
    defaultStatement: `ある三相同期発電機のパーセント同期インピーダンスが %Zs=${pz}% である。この発電機の短絡比 Ks は?`,
    defaultSolution: [`短絡比 Ks=1/(%Zs/100)=100/%Zs`, `Ks=100/${pz}`, `Ks=${answerText}`],
    physicallyValid: true,
  };
}

export const shortCircuitRatio: Template = {
  topic: "同期発電機の短絡比",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    percent_synchronous_impedance: { unit: "%", realistic_range: [50, 300] },
  },
  generate(rng) {
    return buildFrom(pick(PZ_SET, rng));
  },
  generateFrom(params) {
    const { percent_synchronous_impedance } = params;
    if (percent_synchronous_impedance === undefined) return null;
    return buildFrom(percent_synchronous_impedance);
  },
};
