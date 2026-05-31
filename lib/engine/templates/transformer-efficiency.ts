/**
 * テンプレート: 変圧器の効率。
 *
 * 閉形式: η = P_out / (P_out + P_i + P_c) × 100   〔%〕
 *   P_out=出力[kW], P_i=鉄損[kW], P_c=銅損[kW]。
 *
 * numeric 形式（選択肢なし・許容誤差つき）。綺麗な η になる draw のみ採用。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const POUT: ReadonlyArray<number> = [90, 95, 180, 190, 270, 380, 450, 475, 950];
const PI_SET: ReadonlyArray<number> = [1, 2, 2.5, 4, 5, 10];
const PC_SET: ReadonlyArray<number> = [2, 3, 5, 6, 10, 15, 40];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Pout: number, Pi: number, Pc: number): GenerationResult | null {
  if (Pout <= 0 || Pi < 0 || Pc < 0) return null;
  const eta = (Pout / (Pout + Pi + Pc)) * 100; // 正解 [%]
  if (eta <= 0 || eta >= 100 || !isCleanAnswer(eta)) return null;
  const answerText = formatClean(eta);

  return {
    format: "numeric",
    params: {
      output: { value: Pout, unit: "kW", realistic_range: [1, 2000] },
      iron_loss: { value: Pi, unit: "kW", realistic_range: [0.1, 50] },
      copper_loss: { value: Pc, unit: "kW", realistic_range: [0.1, 50] },
    },
    answerValue: eta,
    answerUnit: "%",
    answerText,
    facts: { Pout, Pi, Pc, eta },
    numericTolerance: 0.1,
    defaultStatement:
      `出力 ${Pout}kW で運転中の変圧器の鉄損が ${Pi}kW、銅損が ${Pc}kW である。` + `このときの効率 η〔%〕を求めよ。`,
    defaultSolution: [
      `η = P_out/(P_out + P_i + P_c) × 100`,
      `= ${Pout}/(${Pout} + ${Pi} + ${Pc}) × 100`,
      `η = ${answerText} %`,
    ],
    physicallyValid: true,
  };
}

export const transformerEfficiency: Template = {
  topic: "変圧器の効率",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["機械", "変圧器", "効率", "損失"],
    formulas: ["η = P_out/(P_out + P_i + P_c) × 100", "最大効率条件: P_i = P_c"],
    learningObjectives: ["鉄損・銅損を含む効率を計算でき、最大効率の条件を説明できる"],
    hints: ["効率 = 出力/入力", "入力 = 出力 + 鉄損 + 銅損", "最大効率は鉄損=銅損のとき"],
    prerequisites: ["変圧器の等価回路"],
    relatedTopics: ["変圧器の全日効率", "変圧器の電圧変動率"],
    estimatedTimeSec: 150,
  },
  paramSpecs: {
    output: { unit: "kW", realistic_range: [1, 2000] },
    iron_loss: { unit: "kW", realistic_range: [0.1, 50] },
    copper_loss: { unit: "kW", realistic_range: [0.1, 50] },
  },
  generate(rng) {
    const Pout = pick(POUT, rng);
    const Pi = pick(PI_SET, rng);
    const Pc = pick(PC_SET, rng);
    return buildFrom(Pout, Pi, Pc);
  },
  generateFrom(params) {
    const { output, iron_loss, copper_loss } = params;
    if (output === undefined || iron_loss === undefined || copper_loss === undefined) return null;
    return buildFrom(output, iron_loss, copper_loss);
  },
};
