/**
 * テンプレート: 火力発電の燃料消費量（電力・numeric）。
 *   発電電力量 W〔kWh〕 = 燃料 m〔kg〕× 発熱量 H〔kJ/kg〕× 効率 η ÷ 3600
 *   ⇒ m = 3600·W / (η·H)   〔kg〕  （1kWh = 3600kJ）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

/** (効率%, 発熱量kJ/kg) — 3600/(η·H) が綺麗な kg/kWh になる組だけ採用。 */
const ETA_H_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [40, 45000],
  [36, 50000],
  [30, 40000],
  [45, 40000],
  [36, 40000],
  [40, 36000],
  [50, 36000],
  [30, 48000],
  [45, 32000],
  [25, 48000],
];
const W_SET: ReadonlyArray<number> = [1000, 2000, 4000, 5000, 8000, 10000, 20000];

function buildFrom(etaPct: number, heat: number, energy: number): GenerationResult | null {
  if (etaPct <= 0 || etaPct >= 100 || heat <= 0 || energy <= 0) return null;
  const m = (3600 * energy) / ((etaPct / 100) * heat); // kg
  if (!isCleanAnswer(m)) return null;
  const answerText = formatClean(m);
  return {
    format: "numeric",
    params: {
      efficiency: { value: etaPct, unit: "%", realistic_range: [20, 55] },
      heating_value: { value: heat, unit: "kJ/kg", realistic_range: [30000, 55000] },
      energy: { value: energy, unit: "kWh", realistic_range: [500, 50000] },
    },
    answerValue: m,
    answerUnit: "kg",
    answerText,
    facts: { etaPct, heat, energy, m },
    defaultStatement:
      `発熱量 ${heat}kJ/kg の燃料を使う熱効率 ${etaPct}% の汽力発電所で、` +
      `電力量 ${energy}kWh を発電するのに必要な燃料消費量〔kg〕は?（1kWh=3600kJ）`,
    defaultSolution: [
      `W·3600 = m·H·η より m=3600W/(η·H)`,
      `=3600×${energy}/(${formatClean(etaPct / 100)}×${heat})`,
      `=${answerText}kg`,
    ],
    physicallyValid: true,
  };
}

export const thermalFuelConsumption: Template = {
  topic: "火力発電の燃料消費量",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    efficiency: { unit: "%", realistic_range: [20, 55] },
    heating_value: { unit: "kJ/kg", realistic_range: [30000, 55000] },
    energy: { unit: "kWh", realistic_range: [500, 50000] },
  },
  generate(rng) {
    const [eta, heat] = pick(ETA_H_PAIRS, rng);
    return buildFrom(eta, heat, pick(W_SET, rng));
  },
  generateFrom(params) {
    const { efficiency, heating_value, energy } = params;
    if (efficiency === undefined || heating_value === undefined || energy === undefined) return null;
    return buildFrom(efficiency, heating_value, energy);
  },
};
