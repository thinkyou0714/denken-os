/**
 * テンプレート: 巻上機の電動機所要出力（機械・numeric）。
 *   所要出力  P = W·v / η   〔kW〕（W=荷重〔N〕, v=巻上速度〔m/s〕, η=効率）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const W_SET: ReadonlyArray<number> = [1000, 2000, 4900, 5000, 9800];
const V_SET: ReadonlyArray<number> = [0.5, 1, 2, 4, 5];
// 機構効率は現実的な範囲のみ（0.98 は綺麗な答えになるが物理的に非現実的なので除外）。
const ETA_SET: ReadonlyArray<number> = [0.7, 0.8];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(W: number, v: number, eta: number): GenerationResult | null {
  if (W <= 0 || v <= 0 || eta <= 0 || eta > 1) return null;
  const P = (W * v) / eta / 1000; // kW
  if (!isCleanAnswer(P)) return null;
  const answerText = formatClean(P);
  return {
    format: "numeric",
    params: {
      load: { value: W, unit: "N", realistic_range: [1000, 9800] },
      speed: { value: v, unit: "m/s", realistic_range: [0.5, 5] },
      efficiency: { value: eta, unit: "", realistic_range: [0.6, 0.9] },
    },
    answerValue: P,
    answerUnit: "kW",
    answerText,
    facts: { W, v, eta, P },
    defaultStatement: `荷重 W=${W}N を速度 v=${v}m/s で巻き上げる。機構効率 η=${eta} のとき、電動機の所要出力 P〔kW〕は?`,
    defaultSolution: [
      `巻上仕事率 W·v を効率で割る: P=W·v/η`,
      `P=${W}×${v}/${eta}=${formatClean((W * v) / eta)}W`,
      `=${answerText}kW`,
    ],
    physicallyValid: true,
  };
}

export const hoistMotorOutput: Template = {
  topic: "巻上機の所要出力",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    load: { unit: "N", realistic_range: [1000, 9800] },
    speed: { unit: "m/s", realistic_range: [0.5, 5] },
    efficiency: { unit: "", realistic_range: [0.6, 0.9] },
  },
  generate(rng) {
    return buildFrom(pick(W_SET, rng), pick(V_SET, rng), pick(ETA_SET, rng));
  },
  generateFrom(params) {
    const { load, speed, efficiency } = params;
    if (load === undefined || speed === undefined || efficiency === undefined) return null;
    return buildFrom(load, speed, efficiency);
  },
};
