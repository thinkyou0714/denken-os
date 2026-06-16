/**
 * テンプレート: 送電線の電圧降下（P・Q近似式）（電力・numeric）。
 *   三相送電線の電圧降下の実用近似式:
 *     ΔV = (P·R + Q·X) / V
 *   （P〔kW〕, Q〔kvar〕, R・X〔Ω〕, V: 受電端線間電圧〔kV〕 → ΔV〔V〕。単位整合に注意）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const P_SET: ReadonlyArray<number> = [1000, 2000, 3000, 4000, 5000, 8000];
const PF_RATIO: ReadonlyArray<number> = [0.5, 0.75, 1, 1.25];
const R_SET: ReadonlyArray<number> = [1, 2, 4, 5];
const X_SET: ReadonlyArray<number> = [2, 4, 5, 8, 10];
const V_SET: ReadonlyArray<number> = [10, 20, 50];

type Params = {
  active_power: number;
  reactive_power: number;
  resistance: number;
  reactance: number;
  voltage: number;
};

export const pqVoltageDrop = defineTemplate<Params>({
  topic: "送電線の電圧降下(PQ式)",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 4,
  pastExam: { area: "送電・線路計算", frequency: "high", years: [2009, 2014, 2020, 2024] },
  paramSpecs: {
    active_power: { unit: "kW", realistic_range: [500, 20000] },
    reactive_power: { unit: "kvar", realistic_range: [0, 20000] },
    resistance: { unit: "Ω", realistic_range: [0.5, 20] },
    reactance: { unit: "Ω", realistic_range: [0.5, 30] },
    voltage: { unit: "kV", realistic_range: [6, 80] },
  },
  paramOrder: ["active_power", "reactive_power", "resistance", "reactance", "voltage"],
  draw(rng) {
    const p = pick(P_SET, rng);
    const q = p * pick(PF_RATIO, rng);
    return {
      active_power: p,
      reactive_power: q,
      resistance: pick(R_SET, rng),
      reactance: pick(X_SET, rng),
      voltage: pick(V_SET, rng),
    };
  },
  buildFrom({ active_power: p, reactive_power: q, resistance: r, reactance: x, voltage: v }) {
    if (p <= 0 || q < 0 || r <= 0 || x <= 0 || v <= 0) return null;
    const dv = (p * r + q * x) / v; // (kW·Ω)/kV = V
    if (!isCleanAnswer(dv) || !isCleanAnswer(q)) return null;
    const answerText = formatClean(dv);
    return {
      format: "numeric",
      params: {
        active_power: { value: p, unit: "kW", realistic_range: [500, 20000] },
        reactive_power: { value: q, unit: "kvar", realistic_range: [0, 20000] },
        resistance: { value: r, unit: "Ω", realistic_range: [0.5, 20] },
        reactance: { value: x, unit: "Ω", realistic_range: [0.5, 30] },
        voltage: { value: v, unit: "kV", realistic_range: [6, 80] },
      },
      answerValue: dv,
      answerUnit: "V",
      answerText,
      facts: { p, q, r, x, v, dv },
      defaultStatement:
        `受電端線間電圧 ${formatClean(v)}kV の三相送電線で、受電端の負荷が有効電力 ${formatClean(p)}kW・` +
        `無効電力 ${formatClean(q)}kvar（遅れ）である。線路1相あたりの抵抗 ${formatClean(r)}Ω・` +
        `リアクタンス ${formatClean(x)}Ω のとき、電圧降下の近似値〔V〕は?`,
      defaultSolution: [
        `三相送電線の電圧降下の実用近似式 ΔV=(P·R+Q·X)/V`,
        `=(${formatClean(p)}×${formatClean(r)}+${formatClean(q)}×${formatClean(x)})/${formatClean(v)}` +
          `（単位: kW·Ω/kV=V）`,
        `=${answerText}V`,
      ],
      physicallyValid: true,
    };
  },
});
