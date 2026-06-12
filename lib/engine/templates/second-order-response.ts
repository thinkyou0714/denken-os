/**
 * テンプレート: 二次系の固有角周波数と減衰比（機械制御・二次・numeric）。
 *   単位フィードバック系 開ループ G(s)=K/{s(Ts+1)} の閉ループ伝達関数:
 *     W(s) = K/(Ts²+s+K) = (K/T)/(s²+s/T+K/T)
 *   標準形 ωn²/(s²+2ζωn·s+ωn²) と比較して:
 *     ωn = √(K/T),  ζ = 1/(2√(K·T))
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

/** (K, T) — ωn と ζ がともに綺麗な値になる組だけ採用。 */
const KT_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [4, 1],
  [1, 1],
  [1, 4],
  [25, 1],
  [1, 25],
  [25, 4],
  [4, 25],
  [100, 1],
  [100, 4],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(k: number, t: number): GenerationResult | null {
  if (k <= 0 || t <= 0) return null;
  const omegaN = Math.sqrt(k / t);
  const zeta = 1 / (2 * Math.sqrt(k * t));
  if (!isCleanAnswer(omegaN) || !isCleanAnswer(zeta)) return null;
  const answerText = formatClean(omegaN);
  return {
    format: "numeric",
    params: {
      gain: { value: k, realistic_range: [0.5, 200] },
      time_constant: { value: t, unit: "s", realistic_range: [0.5, 50] },
    },
    answerValue: omegaN,
    answerUnit: "rad/s",
    answerText,
    facts: { k, t, omegaN, zeta },
    defaultStatement:
      `開ループ伝達関数 G(s)=K/{s(Ts+1)}（K=${formatClean(k)}, T=${formatClean(t)}s）の単位フィードバック系がある。` +
      `閉ループ系を標準二次系で表したときの固有角周波数 ωn〔rad/s〕は?`,
    defaultSolution: [
      `閉ループ伝達関数 W(s)=G/(1+G)=K/(Ts²+s+K)`,
      `標準形と比較して ωn=√(K/T), ζ=1/(2√(KT))（本問の ζ=${formatClean(zeta)}）`,
      `ωn=√(${formatClean(k)}/${formatClean(t)})=${answerText}rad/s`,
    ],
    physicallyValid: true,
  };
}

export const secondOrderResponse: Template = {
  topic: "二次系の固有角周波数",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  paramSpecs: {
    gain: { realistic_range: [0.5, 200] },
    time_constant: { unit: "s", realistic_range: [0.5, 50] },
  },
  generate(rng) {
    const [k, t] = pick(KT_PAIRS, rng);
    return buildFrom(k, t);
  },
  generateFrom(params) {
    const { gain, time_constant } = params;
    if (gain === undefined || time_constant === undefined) return null;
    return buildFrom(gain, time_constant);
  },
};
