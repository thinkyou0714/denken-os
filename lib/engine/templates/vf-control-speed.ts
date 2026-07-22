/**
 * テンプレート: V/f一定制御と周波数変更後の回転速度（二種二次・機械制御・descriptive）。
 *   インバータで一次周波数を f1→f2 に変えても、V/f 一定でトルク一定なら
 *   滑り角周波数（滑り速度）は変わらない:
 *     Ns1=120f1/p、滑り速度 = Ns1−N1、N2 = 120f2/p − (Ns1−N1) 〔min⁻¹〕
 *   過去問頻出の「誘導機の回転速度」を、インバータ駆動の周波数変更にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const F1_SET: ReadonlyArray<number> = [50, 60];
const F2_SET: ReadonlyArray<number> = [30, 40, 45, 70, 80];
const POLE_SET: ReadonlyArray<number> = [4, 6];
const SLIP_SET: ReadonlyArray<number> = [0.02, 0.04, 0.05];

type Params = {
  freq_before: number;
  freq_after: number;
  poles: number;
  speed_before: number;
};

export const vfControlSpeed = defineTemplate<Params>({
  topic: "V/f制御と周波数変更後の回転速度",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "回転機の制御", frequency: "high", years: [2009, 2015, 2020, 2025] },
  paramSpecs: {
    freq_before: { unit: "Hz", realistic_range: [40, 70] },
    freq_after: { unit: "Hz", realistic_range: [20, 90] },
    poles: { unit: "極", realistic_range: [2, 8] },
    speed_before: { unit: "min⁻¹", realistic_range: [500, 2200] },
  },
  paramOrder: ["freq_before", "freq_after", "poles", "speed_before"],
  draw(rng) {
    const f1 = pick(F1_SET, rng);
    const p = pick(POLE_SET, rng);
    const s = pick(SLIP_SET, rng);
    const ns1 = (120 * f1) / p;
    return {
      freq_before: f1,
      freq_after: pick(F2_SET, rng),
      poles: p,
      speed_before: ns1 * (1 - s),
    };
  },
  buildFrom({ freq_before: f1, freq_after: f2, poles: p, speed_before: n1 }) {
    if (f1 <= 0 || f2 <= 0 || p <= 0 || n1 <= 0) return null;
    if (f2 === f1) return null;
    if (!Number.isInteger(p) || p % 2 !== 0) return null;
    const ns1 = (120 * f1) / p;
    const ns2 = (120 * f2) / p;
    if (!isCleanAnswer(ns1) || !isCleanAnswer(ns2)) return null;
    const slipSpeed = ns1 - n1;
    if (slipSpeed <= 0) return null; // 電動機運転（N1<Ns1）のみ
    const n2 = ns2 - slipSpeed;
    if (n2 <= 0 || !isCleanAnswer(n2)) return null;
    const answerText = formatClean(n2);
    const ns1Text = formatClean(ns1);
    const ns2Text = formatClean(ns2);
    const slipText = formatClean(slipSpeed);
    return {
      format: "descriptive",
      params: {
        freq_before: { value: f1, unit: "Hz", realistic_range: [40, 70] },
        freq_after: { value: f2, unit: "Hz", realistic_range: [20, 90] },
        poles: { value: p, unit: "極", realistic_range: [2, 8] },
        speed_before: { value: n1, unit: "min⁻¹", realistic_range: [500, 2200] },
      },
      answerValue: n2,
      answerUnit: "min⁻¹",
      answerText,
      facts: { f1, f2, p, n1, ns1, ns2, slipSpeed, n2 },
      defaultStatement:
        `${p}極の三相誘導電動機をインバータで V/f 一定制御し、一次周波数 ${f1}Hz で` +
        `回転速度 ${n1}min⁻¹、一定トルクの負荷を駆動している。負荷トルク一定のまま` +
        `一次周波数を ${f2}Hz に変えたときの回転速度〔min⁻¹〕を求めよ。` +
        `ただし V/f 一定・トルク一定なら滑り速度（同期速度と回転速度の差）は変わらないものとする。`,
      defaultSolution: [
        `着眼点: V/f一定ならギャップ磁束ほぼ一定で、同一トルクを生む滑り速度は周波数によらない。`,
        `変更前の同期速度: Ns1=120×${f1}/${p}=${ns1Text}min⁻¹、滑り速度=${ns1Text}−${n1}=${slipText}min⁻¹`,
        `変更後の同期速度: Ns2=120×${f2}/${p}=${ns2Text}min⁻¹`,
        `N2=Ns2−滑り速度=${ns2Text}−${slipText}=${answerText}min⁻¹`,
        `ポイント: 滑り「率」一定ではなく滑り「速度」一定。s のまま掛けるのが典型ミス。`,
      ],
      physicallyValid: true,
    };
  },
});
