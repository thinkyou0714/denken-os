/**
 * テンプレート: 回転体の出力とトルク（機械・numeric）。
 *   P = ω·T〔W〕（ω: 角速度rad/s, T: トルクN·m）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const OMEGA_SET: ReadonlyArray<number> = [50, 80, 100, 120, 150, 200, 250];
const T_SET: ReadonlyArray<number> = [10, 16, 20, 25, 40, 50, 80, 100];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(omega: number, torque: number): GenerationResult | null {
  if (omega <= 0 || torque <= 0) return null;
  const pKw = (omega * torque) / 1000;
  if (!isCleanAnswer(pKw)) return null;
  const answerText = formatClean(pKw);
  return {
    format: "numeric",
    params: {
      angular_velocity: { value: omega, unit: "rad/s", realistic_range: [10, 400] },
      torque: { value: torque, unit: "N·m", realistic_range: [5, 500] },
    },
    answerValue: pKw,
    answerUnit: "kW",
    answerText,
    facts: { omega, torque, pKw },
    defaultStatement:
      `角速度 ${formatClean(omega)}rad/s で回転する電動機の軸トルクが ${formatClean(torque)}N·m のとき、` +
      `電動機の出力〔kW〕は?`,
    defaultSolution: [
      `回転体の出力 P=ω·T`,
      `=${formatClean(omega)}×${formatClean(torque)}=${formatClean(omega * torque)}W`,
      `=${answerText}kW`,
    ],
    physicallyValid: true,
  };
}

export const rotationalPower: Template = {
  topic: "回転体の出力とトルク",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    angular_velocity: { unit: "rad/s", realistic_range: [10, 400] },
    torque: { unit: "N·m", realistic_range: [5, 500] },
  },
  generate(rng) {
    return buildFrom(pick(OMEGA_SET, rng), pick(T_SET, rng));
  },
  generateFrom(params) {
    const { angular_velocity, torque } = params;
    if (angular_velocity === undefined || torque === undefined) return null;
    return buildFrom(angular_velocity, torque);
  },
};
