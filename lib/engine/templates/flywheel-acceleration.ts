/**
 * テンプレート: 回転体の加速時間（機械・numeric）。
 *   回転の運動方程式 T = J·dω/dt（定トルク）より:
 *     t = J·ω / T〔s〕（J: 慣性モーメント kg·m², ω: 到達角速度 rad/s, T: 加速トルク N·m）
 *   ※ はずみ車効果 GD²〔kg·m²〕で与えられた場合は J=GD²/4 に換算する（解説で注記）。
 *   ※ 旧実装は kgf·m 系の慣用式 t=GD²N/(375T) を N·m のまま使い約9.8倍過小だった。
 *     SI 単位の厳密式に全面改修（Codexレビュー指摘の根本対応）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const J_SET: ReadonlyArray<number> = [2, 4, 5, 10, 20, 25, 40, 50, 100];
const OMEGA_SET: ReadonlyArray<number> = [50, 100, 120, 150, 200, 250, 300];
const T_SET: ReadonlyArray<number> = [10, 20, 25, 40, 50, 100, 125, 200, 250];

function buildFrom(inertia: number, omega: number, torque: number): GenerationResult | null {
  if (inertia <= 0 || omega <= 0 || torque <= 0) return null;
  const t = (inertia * omega) / torque;
  if (!isCleanAnswer(t) || t < 0.5 || t > 600) return null;
  const answerText = formatClean(t);
  return {
    format: "numeric",
    params: {
      inertia: { value: inertia, unit: "kg·m²", realistic_range: [1, 500] },
      omega: { value: omega, unit: "rad/s", realistic_range: [10, 400] },
      torque: { value: torque, unit: "N·m", realistic_range: [5, 1000] },
    },
    answerValue: t,
    answerUnit: "s",
    answerText,
    facts: { inertia, omega, torque, t },
    defaultStatement:
      `慣性モーメント J=${formatClean(inertia)}kg·m² の回転体を、一定の加速トルク ${formatClean(torque)}N·m で` +
      `静止状態から角速度 ${formatClean(omega)}rad/s まで加速するのに要する時間〔s〕は?`,
    defaultSolution: [
      `回転の運動方程式 T=J·dω/dt（定トルク）より t=J·ω/T`,
      `（はずみ車効果 GD²〔kg·m²〕で与えられた場合は J=GD²/4 に換算してから同じ式を使う）`,
      `t=${formatClean(inertia)}×${formatClean(omega)}/${formatClean(torque)}=${answerText}s`,
    ],
    physicallyValid: true,
  };
}

export const rotorAcceleration: Template = {
  topic: "回転体の加速時間",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 4,
  paramSpecs: {
    inertia: { unit: "kg·m²", realistic_range: [1, 500] },
    omega: { unit: "rad/s", realistic_range: [10, 400] },
    torque: { unit: "N·m", realistic_range: [5, 1000] },
  },
  generate(rng) {
    return buildFrom(pick(J_SET, rng), pick(OMEGA_SET, rng), pick(T_SET, rng));
  },
  generateFrom(params) {
    const { inertia, omega, torque } = params;
    if (inertia === undefined || omega === undefined || torque === undefined) return null;
    return buildFrom(inertia, omega, torque);
  },
};
