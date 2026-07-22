/**
 * テンプレート: 半導体スイッチのスイッチング損失（二種二次・機械制御・descriptive）。
 *   ターンオン・ターンオフの各遷移で電圧・電流が直線的に交差すると近似すれば、
 *   1回の遷移で失うエネルギーは (1/6)V·I·ts だが、試験では簡便に
 *     P = (1/2)·V·I·(ton+toff)·f 〔W〕
 *   （V: 阻止電圧, I: 通電電流, f: スイッチング周波数）と近似する形が頻出。
 *   本テンプレートもこの近似式を問題文で与えて用いる。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const V_SET: ReadonlyArray<number> = [400, 600, 800];
const I_SET: ReadonlyArray<number> = [50, 100, 200];
/** ton+toff の合計〔μs〕。 */
const TS_SET: ReadonlyArray<number> = [2, 4, 5];
/** スイッチング周波数〔kHz〕。 */
const F_SET: ReadonlyArray<number> = [2, 5, 10];

type Params = {
  blocking_voltage: number;
  on_current: number;
  switching_time: number;
  switching_frequency: number;
};

export const switchingLoss = defineTemplate<Params>({
  topic: "スイッチング損失の計算",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "パワーエレクトロニクス", frequency: "mid", years: [2012, 2017, 2023] },
  paramSpecs: {
    blocking_voltage: { unit: "V", realistic_range: [200, 1500] },
    on_current: { unit: "A", realistic_range: [20, 400] },
    switching_time: { unit: "μs", realistic_range: [0.5, 10] },
    switching_frequency: { unit: "kHz", realistic_range: [1, 20] },
  },
  paramOrder: ["blocking_voltage", "on_current", "switching_time", "switching_frequency"],
  draw(rng) {
    return {
      blocking_voltage: pick(V_SET, rng),
      on_current: pick(I_SET, rng),
      switching_time: pick(TS_SET, rng),
      switching_frequency: pick(F_SET, rng),
    };
  },
  buildFrom({ blocking_voltage: v, on_current: i, switching_time: tsUs, switching_frequency: fKhz }) {
    if (v <= 0 || i <= 0 || tsUs <= 0 || fKhz <= 0) return null;
    // μs×kHz = 10⁻⁶×10³ = 10⁻³ のスケール。
    const loss = (0.5 * v * i * tsUs * fKhz) / 1000;
    // 実デバイスとして現実的な損失（10W〜2kW）の綺麗な値のみ採用。
    if (loss < 10 || loss > 2000 || !isCleanAnswer(loss)) return null;
    const answerText = formatClean(loss);
    return {
      format: "descriptive",
      params: {
        blocking_voltage: { value: v, unit: "V", realistic_range: [200, 1500] },
        on_current: { value: i, unit: "A", realistic_range: [20, 400] },
        switching_time: { value: tsUs, unit: "μs", realistic_range: [0.5, 10] },
        switching_frequency: { value: fKhz, unit: "kHz", realistic_range: [1, 20] },
      },
      answerValue: loss,
      answerUnit: "W",
      answerText,
      facts: { v, i, tsUs, fKhz, loss },
      defaultStatement:
        `直流電圧 ${v}V・通電電流 ${i}A の回路で IGBT をスイッチング周波数 ${fKhz}kHz で開閉する。` +
        `ターンオン時間とターンオフ時間の合計は ${tsUs}μs で、スイッチング損失は` +
        ` P=(1/2)·V·I·(ton+toff)·f で近似できるものとする。このスイッチング損失〔W〕を求めよ。`,
      defaultSolution: [
        `着眼点: 遷移中は電圧と電流が同時に存在し、その積の時間積分×回数が損失になる。`,
        `P=(1/2)·V·I·(ton+toff)·f`,
        `P=0.5×${v}×${i}×${tsUs}×10⁻⁶×${fKhz}×10³`,
        `P=${answerText}W`,
        `ポイント: スイッチング損失は f に比例する。高周波化と低損失化はトレードオフ。`,
      ],
      physicallyValid: true,
    };
  },
});
