/**
 * テンプレート: 変圧器容量の選定（法規・numeric）。
 *   設備容量×需要率で最大需要を求め、力率で割って変圧器所要容量〔kVA〕を選定する。
 *     最大需要電力 = 設備容量 × 需要率   〔kW〕
 *     変圧器所要容量 S = 最大需要電力 / 力率   〔kVA〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const INSTALLED_SET: ReadonlyArray<number> = [150, 200, 250, 300, 400, 500]; // 〔kW〕
const DEMAND_SET: ReadonlyArray<number> = [0.5, 0.6, 0.7, 0.8];
const PF_SET: ReadonlyArray<number> = [0.8, 0.9, 1.0];

type Params = {
  installed_capacity: number;
  demand_factor: number;
  power_factor: number;
};

export const transformerCapacitySelection = defineTemplate<Params>({
  topic: "変圧器容量の選定",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: {
    area: "電気計算（B問題）",
    frequency: "high",
    years: [2009, 2014, 2019, 2024],
    note: "設備容量×需要率で最大需要を求め、力率で割って変圧器所要容量〔kVA〕を選定",
  },
  paramSpecs: {
    installed_capacity: { unit: "kW", realistic_range: [150, 500] },
    demand_factor: { realistic_range: [0.5, 0.8] },
    power_factor: { realistic_range: [0.8, 1.0] },
  },
  paramOrder: ["installed_capacity", "demand_factor", "power_factor"],
  draw(rng) {
    return {
      installed_capacity: pick(INSTALLED_SET, rng),
      demand_factor: pick(DEMAND_SET, rng),
      power_factor: pick(PF_SET, rng),
    };
  },
  buildFrom({ installed_capacity, demand_factor, power_factor }) {
    if (demand_factor <= 0 || demand_factor > 1 || power_factor <= 0 || power_factor > 1) return null;
    const maxDemand = installed_capacity * demand_factor; // 最大需要電力〔kW〕
    const S = maxDemand / power_factor; // 変圧器所要容量〔kVA〕
    if (!isCleanAnswer(S)) return null;
    const answerText = formatClean(S);
    const maxDemandText = formatClean(maxDemand);
    return {
      format: "numeric",
      params: {
        installed_capacity: { value: installed_capacity, unit: "kW", realistic_range: [150, 500] },
        demand_factor: { value: demand_factor, realistic_range: [0.5, 0.8] },
        power_factor: { value: power_factor, realistic_range: [0.8, 1.0] },
      },
      answerValue: S,
      answerUnit: "kVA",
      answerText,
      facts: { installed_capacity, demand_factor, power_factor, maxDemand, S },
      defaultStatement:
        `ある需要設備の設備容量が ${formatClean(installed_capacity)}kW、需要率が ${formatClean(demand_factor)}、` +
        `負荷の力率が ${formatClean(power_factor)} であるとき、必要な変圧器の所要容量〔kVA〕を求めよ。`,
      defaultSolution: [
        `最大需要電力 = 設備容量×需要率 = ${formatClean(installed_capacity)}×${formatClean(demand_factor)} = ${maxDemandText}kW`,
        `変圧器所要容量 S = 最大需要/力率 = ${maxDemandText}/${formatClean(power_factor)}`,
        `S = ${answerText}kVA`,
      ],
      physicallyValid: true,
    };
  },
});
