/**
 * テンプレート: 直流電動機の界磁弱め制御（二種二次・機械制御・descriptive）。
 *   電機子抵抗の電圧降下を無視すると N ∝ V/φ。端子電圧一定で界磁磁束を k 倍
 *   （k<1）に弱めると
 *     N2 = N1/k 〔min⁻¹〕（トルク一定なら電機子電流は Ia2=Ia1/k に増える）
 *   過去問頻出の「直流機の速度制御」を、抵抗制御ではなく界磁制御側にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const N1_SET: ReadonlyArray<number> = [1000, 1200, 1500, 1800];
const K_SET: ReadonlyArray<number> = [0.5, 0.6, 0.75, 0.8, 0.9];
const IA_SET: ReadonlyArray<number> = [20, 30, 40, 60];

type Params = {
  initial_speed: number;
  flux_ratio: number;
  armature_current: number;
};

export const dcMotorFieldWeakening = defineTemplate<Params>({
  topic: "直流電動機の界磁弱め制御",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "回転機の制御", frequency: "high", years: [2008, 2013, 2019, 2024] },
  paramSpecs: {
    initial_speed: { unit: "min⁻¹", realistic_range: [500, 3000] },
    flux_ratio: { unit: "", realistic_range: [0.4, 1] },
    armature_current: { unit: "A", realistic_range: [10, 100] },
  },
  paramOrder: ["initial_speed", "flux_ratio", "armature_current"],
  draw(rng) {
    return {
      initial_speed: pick(N1_SET, rng),
      flux_ratio: pick(K_SET, rng),
      armature_current: pick(IA_SET, rng),
    };
  },
  buildFrom({ initial_speed: n1, flux_ratio: k, armature_current: ia1 }) {
    if (n1 <= 0 || ia1 <= 0) return null;
    if (k <= 0 || k >= 1) return null; // 界磁を「弱める」場合のみ
    const n2 = n1 / k;
    const ia2 = ia1 / k;
    if (!isCleanAnswer(n2) || !isCleanAnswer(ia2)) return null;
    const answerText = formatClean(n2);
    const ia2Text = formatClean(ia2);
    return {
      format: "descriptive",
      params: {
        initial_speed: { value: n1, unit: "min⁻¹", realistic_range: [500, 3000] },
        flux_ratio: { value: k, unit: "", realistic_range: [0.4, 1] },
        armature_current: { value: ia1, unit: "A", realistic_range: [10, 100] },
      },
      answerValue: n2,
      answerUnit: "min⁻¹",
      answerText,
      facts: { n1, k, ia1, n2, ia2 },
      defaultStatement:
        `端子電圧一定の直流分巻電動機が、回転速度 ${n1}min⁻¹、電機子電流 ${ia1}A で` +
        `一定トルクの負荷を駆動している。界磁抵抗器を調整して界磁磁束を ${k}倍 に弱めたとき、` +
        `落ち着いた後の回転速度〔min⁻¹〕を求めよ。ただし電機子抵抗の電圧降下と磁気飽和は無視する。`,
      defaultSolution: [
        `着眼点: E=kφN≒V（一定）なので N∝1/φ。磁束を弱めると速度は上がる。`,
        `N2=N1/k=${n1}/${formatClean(k)}=${answerText}min⁻¹`,
        `（トルク T∝φIa 一定のため電機子電流は Ia2=${ia1}/${formatClean(k)}=${ia2Text}A に増える）`,
        `ポイント: 界磁弱めは「基底速度以上」の定出力領域を作る制御。電流増に注意する。`,
      ],
      physicallyValid: true,
    };
  },
});
