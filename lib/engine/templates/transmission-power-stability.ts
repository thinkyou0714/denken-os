/**
 * テンプレート: 送電電力（定態安定極限）（二種二次・電力管理・descriptive）。
 *   送電電力  P = Vs·Vr·sinδ / X   〔MW〕（Vs,Vr〔kV〕, X〔Ω〕, δ=相差角）
 *   δ=90°で最大（定態安定極限）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const VS_SET: ReadonlyArray<number> = [60, 66, 100, 110];
const VR_SET: ReadonlyArray<number> = [60, 66, 100];
const X_SET: ReadonlyArray<number> = [40, 50, 60, 66, 100];
const DELTA_SET: ReadonlyArray<readonly [number, number]> = [
  [30, 0.5],
  [90, 1.0],
];

function buildFrom(Vs: number, Vr: number, X: number, deg: number, sin: number): GenerationResult | null {
  if (Vs <= 0 || Vr <= 0 || X <= 0 || sin <= 0) return null;
  const P = (Vs * Vr * sin) / X;
  if (!isCleanAnswer(P)) return null;
  const answerText = formatClean(P);
  return {
    format: "descriptive",
    params: {
      sending_voltage: { value: Vs, unit: "kV", realistic_range: [60, 110] },
      receiving_voltage: { value: Vr, unit: "kV", realistic_range: [60, 110] },
      reactance: { value: X, unit: "ohm", realistic_range: [40, 100] },
      phase_angle: { value: deg, unit: "deg", realistic_range: [0, 90] },
    },
    answerValue: P,
    answerUnit: "MW",
    answerText,
    facts: { Vs, Vr, X, deg, sin, P },
    defaultStatement:
      `送電端電圧 Vs=${Vs}kV、受電端電圧 Vr=${Vr}kV、線路リアクタンス X=${X}Ω、相差角 δ=${deg}° である。` +
      `送電電力 P〔MW〕を P=Vs·Vr·sinδ/X により導出過程とともに求めよ。`,
    defaultSolution: [
      `送電電力 P=Vs·Vr·sinδ/X（Vs,Vr は kV、X は Ω）`,
      `P=${Vs}×${Vr}×${sin}/${X}`,
      `P=${answerText}MW`,
      `ポイント: δ=90°で最大（定態安定極限）。Xを小さくすると送電容量が増える。`,
    ],
    physicallyValid: true,
  };
}

export const transmissionPowerStability: Template = {
  topic: "送電電力（安定度）",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  paramSpecs: {
    sending_voltage: { unit: "kV", realistic_range: [60, 110] },
    receiving_voltage: { unit: "kV", realistic_range: [60, 110] },
    reactance: { unit: "ohm", realistic_range: [40, 100] },
    phase_angle: { unit: "deg", realistic_range: [0, 90] },
  },
  generate(rng) {
    const [deg, sin] = pick(DELTA_SET, rng);
    return buildFrom(pick(VS_SET, rng), pick(VR_SET, rng), pick(X_SET, rng), deg, sin);
  },
  generateFrom(params) {
    const { sending_voltage, receiving_voltage, reactance, phase_angle } = params;
    if (
      sending_voltage === undefined ||
      receiving_voltage === undefined ||
      reactance === undefined ||
      phase_angle === undefined
    ) {
      return null;
    }
    const sin = Number(Math.sin((phase_angle * Math.PI) / 180).toFixed(4));
    return buildFrom(sending_voltage, receiving_voltage, reactance, phase_angle, sin);
  },
};
