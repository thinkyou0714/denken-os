/**
 * テンプレート: 電気加熱の所要時間（機械・numeric）。
 *   必要熱量 Q = c·m·Δθ〔kJ〕（水の比熱 c=4.2kJ/(kg·K)）
 *   投入熱量 = P〔kW〕× t〔s〕× η  ⇒  t = c·m·Δθ/(P·η)〔s〕 → 分に換算
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const C_WATER = 4.2; // kJ/(kg·K)
const M_SET: ReadonlyArray<number> = [20, 50, 100, 200];
const DT_SET: ReadonlyArray<number> = [10, 20, 30, 40, 50, 60];
const P_SET: ReadonlyArray<number> = [2, 3.5, 4.2, 7, 10.5, 14];
const ETA_SET: ReadonlyArray<number> = [0.7, 0.75, 0.8, 0.84, 0.9];

type Params = {
  mass: number;
  delta_theta: number;
  power: number;
  efficiency: number;
};

export const electricHeating = defineTemplate<Params>({
  topic: "電気加熱の所要時間",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    mass: { unit: "kg", realistic_range: [5, 500] },
    delta_theta: { unit: "K", realistic_range: [5, 80] },
    power: { unit: "kW", realistic_range: [1, 20] },
    efficiency: { realistic_range: [0.5, 1] },
  },
  paramOrder: ["mass", "delta_theta", "power", "efficiency"],
  draw(rng) {
    return {
      mass: pick(M_SET, rng),
      delta_theta: pick(DT_SET, rng),
      power: pick(P_SET, rng),
      efficiency: pick(ETA_SET, rng),
    };
  },
  buildFrom({ mass, delta_theta: dTheta, power, efficiency: eta }) {
    if (mass <= 0 || dTheta <= 0 || power <= 0 || eta <= 0 || eta > 1) return null;
    const tSec = (C_WATER * mass * dTheta) / (power * eta);
    const tMin = tSec / 60;
    if (!isCleanAnswer(tMin)) return null;
    const answerText = formatClean(tMin);
    return {
      format: "numeric",
      params: {
        mass: { value: mass, unit: "kg", realistic_range: [5, 500] },
        delta_theta: { value: dTheta, unit: "K", realistic_range: [5, 80] },
        power: { value: power, unit: "kW", realistic_range: [1, 20] },
        efficiency: { value: eta, realistic_range: [0.5, 1] },
      },
      answerValue: tMin,
      answerUnit: "min",
      answerText,
      facts: { mass, dTheta, power, eta, tMin },
      defaultStatement:
        `電気温水器で水 ${mass}kg を ${dTheta}K 上昇させる。ヒータ出力 ${power}kW、装置の効率 ${eta} のとき、` +
        `所要時間〔min〕は?（水の比熱 4.2kJ/(kg·K)）`,
      defaultSolution: [
        `必要熱量 Q=c·m·Δθ=4.2×${mass}×${dTheta}=${formatClean(C_WATER * mass * dTheta)}kJ`,
        `t=Q/(P·η)=${formatClean(C_WATER * mass * dTheta)}/(${power}×${eta})=${formatClean(tSec)}s`,
        `=${answerText}min`,
      ],
      physicallyValid: true,
    };
  },
});
