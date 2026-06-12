/**
 * テンプレート: コンバインドサイクルの熱効率（電力・numeric）。
 *   ガスタービン効率 ηG と、その排熱で動く汽力（蒸気タービン）効率 ηS の組合せ:
 *     η = ηG + (1 − ηG)·ηS = ηG + ηS − ηG·ηS   〔小数〕
 *   （排熱 (1−ηG) のうち ηS を回収する、の式変形。過去問頻出の導出）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const ETA_G_SET: ReadonlyArray<number> = [25, 30, 35, 40];
const ETA_S_SET: ReadonlyArray<number> = [20, 25, 30, 35, 40];

function buildFrom(etaG: number, etaS: number): GenerationResult | null {
  if (etaG <= 0 || etaG >= 100 || etaS <= 0 || etaS >= 100) return null;
  const eta = etaG + etaS - (etaG * etaS) / 100; // %
  if (eta >= 100 || !isCleanAnswer(eta)) return null;
  const answerText = formatClean(eta);
  return {
    format: "numeric",
    params: {
      eta_gas: { value: etaG, unit: "%", realistic_range: [20, 45] },
      eta_steam: { value: etaS, unit: "%", realistic_range: [15, 45] },
    },
    answerValue: eta,
    answerUnit: "%",
    answerText,
    facts: { etaG, etaS, eta },
    defaultStatement:
      `ガスタービンの熱効率が ${etaG}%、その排熱を利用する蒸気タービン部分の熱効率が ${etaS}% の` +
      `コンバインドサイクル発電の総合熱効率〔%〕は?`,
    defaultSolution: [
      `総合効率 η=ηG+(1−ηG)·ηS（ガスで ηG を回収し、残り排熱 (1−ηG) から ηS を回収）`,
      `=${etaG}% + (1−${formatClean(etaG / 100)})×${etaS}%`,
      `=${answerText}%`,
    ],
    physicallyValid: true,
  };
}

export const combinedCycleEfficiency: Template = {
  topic: "コンバインドサイクルの熱効率",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    eta_gas: { unit: "%", realistic_range: [20, 45] },
    eta_steam: { unit: "%", realistic_range: [15, 45] },
  },
  generate(rng) {
    return buildFrom(pick(ETA_G_SET, rng), pick(ETA_S_SET, rng));
  },
  generateFrom(params) {
    const { eta_gas, eta_steam } = params;
    if (eta_gas === undefined || eta_steam === undefined) return null;
    return buildFrom(eta_gas, eta_steam);
  },
};
