/**
 * テンプレート: 送電電力（定態安定極限）（二種二次・電力管理・descriptive）。
 *   送電電力  P = Vs·Vr·sinδ / X   〔MW〕（Vs,Vr〔kV〕, X〔Ω〕, δ=相差角）
 *   δ=90°で最大（定態安定極限）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const VS_SET: ReadonlyArray<number> = [60, 66, 100, 110];
const VR_SET: ReadonlyArray<number> = [60, 66, 100];
const X_SET: ReadonlyArray<number> = [40, 50, 60, 66, 100];
// 相差角δ(deg)。sinδ は Math.sin で計算する（事前表は持たない）。
const DELTA_SET: ReadonlyArray<number> = [30, 90];

type Params = {
  sending_voltage: number;
  receiving_voltage: number;
  reactance: number;
  phase_angle: number;
};

export const transmissionPowerStability = defineTemplate<Params>({
  topic: "送電電力（安定度）",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "送電・系統安定度", frequency: "high", years: [2009, 2014, 2019, 2024] },
  paramSpecs: {
    sending_voltage: { unit: "kV", realistic_range: [60, 110] },
    receiving_voltage: { unit: "kV", realistic_range: [60, 110] },
    reactance: { unit: "Ω", realistic_range: [40, 100] },
    phase_angle: { unit: "deg", realistic_range: [0, 90] },
  },
  paramOrder: ["sending_voltage", "receiving_voltage", "reactance", "phase_angle"],
  draw(rng) {
    const deg = pick(DELTA_SET, rng);
    return {
      sending_voltage: pick(VS_SET, rng),
      receiving_voltage: pick(VR_SET, rng),
      reactance: pick(X_SET, rng),
      phase_angle: deg,
    };
  },
  buildFrom({ sending_voltage: Vs, receiving_voltage: Vr, reactance: X, phase_angle: deg }) {
    if (Vs <= 0 || Vr <= 0 || X <= 0) return null;
    const sin = Number(Math.sin((deg * Math.PI) / 180).toFixed(4));
    if (sin <= 0) return null;
    const P = (Vs * Vr * sin) / X;
    if (!isCleanAnswer(P)) return null;
    const answerText = formatClean(P);
    return {
      format: "descriptive",
      params: {
        sending_voltage: { value: Vs, unit: "kV", realistic_range: [60, 110] },
        receiving_voltage: { value: Vr, unit: "kV", realistic_range: [60, 110] },
        reactance: { value: X, unit: "Ω", realistic_range: [40, 100] },
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
  },
});
