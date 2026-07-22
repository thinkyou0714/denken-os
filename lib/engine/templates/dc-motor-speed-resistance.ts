/**
 * テンプレート: 直流分巻電動機の抵抗制御（二種二次・機械制御・descriptive）。
 *   端子電圧 V・電機子抵抗 Ra・電機子電流 Ia（負荷トルク一定 ⇒ Ia 一定）のとき、
 *   電機子回路に直列抵抗 R を挿入すると逆起電力が E1=V−Ia·Ra → E2=V−Ia·(Ra+R) となり、
 *   界磁一定なら回転速度は逆起電力に比例する:
 *     N2 = N1 × E2/E1 〔min⁻¹〕
 *   過去問頻出の「直流機の速度制御」を、挿入抵抗と速度の関係でひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const V_SET: ReadonlyArray<number> = [110, 220];
const IA_SET: ReadonlyArray<number> = [20, 40];
const RA_SET: ReadonlyArray<number> = [0.25, 0.5];
const R_SET: ReadonlyArray<number> = [0.5, 0.75, 1, 1.5];
const N1_SET: ReadonlyArray<number> = [1000, 1200, 1500];

type Params = {
  terminal_voltage: number;
  armature_current: number;
  armature_resistance: number;
  series_resistance: number;
  initial_speed: number;
};

export const dcMotorSpeedResistance = defineTemplate<Params>({
  topic: "直流分巻電動機の抵抗制御",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 5,
  pastExam: { area: "回転機の制御", frequency: "high", years: [2006, 2011, 2017, 2021] },
  paramSpecs: {
    terminal_voltage: { unit: "V", realistic_range: [100, 250] },
    armature_current: { unit: "A", realistic_range: [10, 60] },
    armature_resistance: { unit: "Ω", realistic_range: [0.1, 1] },
    series_resistance: { unit: "Ω", realistic_range: [0.2, 2] },
    initial_speed: { unit: "min⁻¹", realistic_range: [800, 2000] },
  },
  paramOrder: ["terminal_voltage", "armature_current", "armature_resistance", "series_resistance", "initial_speed"],
  draw(rng) {
    return {
      terminal_voltage: pick(V_SET, rng),
      armature_current: pick(IA_SET, rng),
      armature_resistance: pick(RA_SET, rng),
      series_resistance: pick(R_SET, rng),
      initial_speed: pick(N1_SET, rng),
    };
  },
  buildFrom({
    terminal_voltage: v,
    armature_current: ia,
    armature_resistance: ra,
    series_resistance: r,
    initial_speed: n1,
  }) {
    if (v <= 0 || ia <= 0 || ra <= 0 || r <= 0 || n1 <= 0) return null;
    const e1 = v - ia * ra;
    const e2 = v - ia * (ra + r);
    if (e1 <= 0 || e2 <= 0 || e2 >= e1) return null;
    const n2 = (n1 * e2) / e1;
    if (n2 <= 0 || !isCleanAnswer(e1) || !isCleanAnswer(e2) || !isCleanAnswer(n2)) return null;
    const answerText = formatClean(n2);
    const e1Text = formatClean(e1);
    const e2Text = formatClean(e2);
    return {
      format: "descriptive",
      params: {
        terminal_voltage: { value: v, unit: "V", realistic_range: [100, 250] },
        armature_current: { value: ia, unit: "A", realistic_range: [10, 60] },
        armature_resistance: { value: ra, unit: "Ω", realistic_range: [0.1, 1] },
        series_resistance: { value: r, unit: "Ω", realistic_range: [0.2, 2] },
        initial_speed: { value: n1, unit: "min⁻¹", realistic_range: [800, 2000] },
      },
      answerValue: n2,
      answerUnit: "min⁻¹",
      answerText,
      facts: { v, ia, ra, r, n1, e1, e2, n2 },
      defaultStatement:
        `端子電圧 ${v}V、電機子抵抗 ${ra}Ω の直流分巻電動機が、電機子電流 ${ia}A、` +
        `回転速度 ${n1}min⁻¹ で運転している。負荷トルクと界磁磁束は一定のまま、電機子回路に` +
        `${r}Ω の抵抗を直列に挿入したときの回転速度 N2〔min⁻¹〕を求めよ。`,
      defaultSolution: [
        `着眼点: トルク一定・界磁一定なら Ia 不変で、速度は逆起電力 E=V−Ia·R に比例する。`,
        `挿入前: E1=${v}−${ia}×${ra}=${e1Text}V`,
        `挿入後: E2=${v}−${ia}×(${ra}+${r})=${e2Text}V`,
        `N2=N1×E2/E1=${n1}×${e2Text}/${e1Text}=${answerText}min⁻¹`,
        `ポイント: 挿入抵抗の電圧降下 Ia·R がそのまま逆起電力の減少になり速度が下がる。`,
      ],
      physicallyValid: true,
    };
  },
});
