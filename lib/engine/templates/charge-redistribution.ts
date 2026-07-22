/**
 * テンプレート: コンデンサの並列接続と電荷再配分（二種一次・理論・numeric）。
 *   V0 に充電した C1 を、無充電の C2 に並列接続すると、電荷保存則から共通電圧は
 *     V = C1·V0/(C1+C2) 〔V〕
 *   過去問頻出の「コンデンサの接続」を、接続後の電圧（とエネルギーが減る理由）に
 *   ひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const C1_SET: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6, 8, 10];
const C2_SET: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6, 10];
const V0_SET: ReadonlyArray<number> = [60, 90, 100, 120, 150, 200, 240, 300];

type Params = {
  charged_capacitance: number;
  uncharged_capacitance: number;
  initial_voltage: number;
};

export const chargeRedistribution = defineTemplate<Params>({
  topic: "コンデンサの電荷再配分",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 4,
  pastExam: { area: "静電気", frequency: "high", years: [2009, 2013, 2018, 2024] },
  paramSpecs: {
    charged_capacitance: { unit: "μF", realistic_range: [0.5, 10] },
    uncharged_capacitance: { unit: "μF", realistic_range: [0.5, 10] },
    initial_voltage: { unit: "V", realistic_range: [50, 500] },
  },
  paramOrder: ["charged_capacitance", "uncharged_capacitance", "initial_voltage"],
  draw(rng) {
    return {
      charged_capacitance: pick(C1_SET, rng),
      uncharged_capacitance: pick(C2_SET, rng),
      initial_voltage: pick(V0_SET, rng),
    };
  },
  buildFrom({ charged_capacitance: c1, uncharged_capacitance: c2, initial_voltage: v0 }) {
    if (c1 <= 0 || c2 <= 0 || v0 <= 0) return null;
    const charge = c1 * v0; // μC
    const voltage = charge / (c1 + c2);
    if (voltage <= 0 || voltage >= v0) return null;
    if (!isCleanAnswer(charge) || !isCleanAnswer(voltage)) return null;
    const answerText = formatClean(voltage);
    const q = formatClean(charge);
    return {
      format: "numeric",
      params: {
        charged_capacitance: { value: c1, unit: "μF", realistic_range: [0.5, 10] },
        uncharged_capacitance: { value: c2, unit: "μF", realistic_range: [0.5, 10] },
        initial_voltage: { value: v0, unit: "V", realistic_range: [50, 500] },
      },
      answerValue: voltage,
      answerUnit: "V",
      answerText,
      facts: { c1, c2, v0, charge, voltage },
      defaultStatement:
        `静電容量 ${c1}μF のコンデンサを ${v0}V に充電したのち電源から切り離し、` +
        `無充電の ${c2}μF のコンデンサと並列に接続した。接続後の端子電圧〔V〕を求めよ。`,
      defaultSolution: [
        `着眼点: 接続の前後で全電荷は保存される（Q=C1·V0 が C1+C2 に分配される）。`,
        `Q=${c1}×${v0}=${q}μC`,
        `V=Q/(C1+C2)=${q}/(${c1}+${c2})=${answerText}V`,
        `（静電エネルギーは接続時の突入電流で一部失われ、保存されない点に注意）`,
        `ポイント: エネルギー保存で解くと誤答になる。保存されるのは電荷である。`,
      ],
      physicallyValid: true,
    };
  },
});
