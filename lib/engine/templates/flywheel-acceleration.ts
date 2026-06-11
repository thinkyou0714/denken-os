/**
 * テンプレート: はずみ車効果と加速時間（機械・numeric）。
 *   実用公式: t = GD²·N / (375·T)〔s〕
 *   （GD²: はずみ車効果kg·m², N: 到達回転速度min⁻¹, T: 加速トルクN·m。
 *     375 = 4·60·9.55⁻¹… の整理で生じる慣用定数）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const GD2_SET: ReadonlyArray<number> = [150, 300, 500, 750, 1000, 1500];
const N_SET: ReadonlyArray<number> = [600, 750, 900, 1200, 1500, 1800];
const T_SET: ReadonlyArray<number> = [40, 50, 80, 100, 120, 200, 240, 300];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(gd2: number, speed: number, torque: number): GenerationResult | null {
  if (gd2 <= 0 || speed <= 0 || torque <= 0) return null;
  const t = (gd2 * speed) / (375 * torque);
  if (!isCleanAnswer(t)) return null;
  const answerText = formatClean(t);
  return {
    format: "numeric",
    params: {
      flywheel_effect: { value: gd2, unit: "kg·m²", realistic_range: [50, 5000] },
      speed: { value: speed, unit: "min^-1", realistic_range: [300, 3600] },
      torque: { value: torque, unit: "N·m", realistic_range: [10, 1000] },
    },
    answerValue: t,
    answerUnit: "s",
    answerText,
    facts: { gd2, speed, torque, t },
    defaultStatement:
      `はずみ車効果 GD²=${formatClean(gd2)}kg·m² の回転体を、一定の加速トルク ${formatClean(torque)}N·m で` +
      `静止状態から ${formatClean(speed)}min⁻¹ まで加速するのに要する時間〔s〕は?`,
    defaultSolution: [
      `加速時間の実用公式 t=GD²·N/(375·T)`,
      `=${formatClean(gd2)}×${formatClean(speed)}/(375×${formatClean(torque)})`,
      `=${answerText}s`,
    ],
    physicallyValid: true,
  };
}

export const flywheelAcceleration: Template = {
  topic: "はずみ車効果と加速時間",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 4,
  paramSpecs: {
    flywheel_effect: { unit: "kg·m²", realistic_range: [50, 5000] },
    speed: { unit: "min^-1", realistic_range: [300, 3600] },
    torque: { unit: "N·m", realistic_range: [10, 1000] },
  },
  generate(rng) {
    return buildFrom(pick(GD2_SET, rng), pick(N_SET, rng), pick(T_SET, rng));
  },
  generateFrom(params) {
    const { flywheel_effect, speed, torque } = params;
    if (flywheel_effect === undefined || speed === undefined || torque === undefined) return null;
    return buildFrom(flywheel_effect, speed, torque);
  },
};
