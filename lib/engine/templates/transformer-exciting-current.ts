/**
 * テンプレート: 変圧器の励磁電流（機械・numeric）。
 *   無負荷試験: 鉄損電流 Iw = Pi/V, 磁化電流 Iμ = √(I0² − Iw²)
 *   (Iw, Iμ, I0) がピタゴラス数になる組に限定して綺麗な値を担保。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

/** (V, Pi, I0) — Iw=Pi/V と I0 がピタゴラス組（Iμ が綺麗）。 */
const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [200, 600, 5], // Iw=3, Iμ=4
  [200, 800, 5], // Iw=4, Iμ=3
  [100, 300, 5], // Iw=3, Iμ=4
  [200, 1200, 10], // Iw=6, Iμ=8
  [400, 2400, 10], // Iw=6, Iμ=8
  [200, 1000, 13], // Iw=5, Iμ=12
  [100, 900, 15], // Iw=9, Iμ=12
  [400, 3200, 17], // Iw=8, Iμ=15
];

type Params = {
  voltage: number;
  iron_loss: number;
  no_load_current: number;
};

export const transformerExcitingCurrent = defineTemplate<Params>({
  topic: "変圧器の励磁電流",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "変圧器", frequency: "mid", years: [2011, 2017, 2023] },
  paramSpecs: {
    voltage: { unit: "V", realistic_range: [100, 600] },
    iron_loss: { unit: "W", realistic_range: [100, 5000] },
    no_load_current: { unit: "A", realistic_range: [1, 30] },
  },
  paramOrder: ["voltage", "iron_loss", "no_load_current"],
  draw(rng) {
    const [v, pi, i0] = pick(TRIPLES, rng);
    return { voltage: v, iron_loss: pi, no_load_current: i0 };
  },
  buildFrom({ voltage: v, iron_loss: pi, no_load_current: i0 }) {
    if (v <= 0 || pi <= 0 || i0 <= 0) return null;
    const iw = pi / v;
    if (iw >= i0) return null;
    const imu = Math.sqrt(i0 * i0 - iw * iw);
    if (!isCleanAnswer(iw) || !isCleanAnswer(imu)) return null;
    const answerText = formatClean(imu);
    return {
      format: "numeric",
      params: {
        voltage: { value: v, unit: "V", realistic_range: [100, 600] },
        iron_loss: { value: pi, unit: "W", realistic_range: [100, 5000] },
        no_load_current: { value: i0, unit: "A", realistic_range: [1, 30] },
      },
      answerValue: imu,
      answerUnit: "A",
      answerText,
      facts: { v, pi, i0, iw, imu },
      defaultStatement:
        `変圧器の無負荷試験で、電圧 ${formatClean(v)}V を加えたところ無負荷電流 ${formatClean(i0)}A、` +
        `鉄損 ${formatClean(pi)}W であった。磁化電流〔A〕は?`,
      defaultSolution: [
        `鉄損電流 Iw=Pi/V=${formatClean(pi)}/${formatClean(v)}=${formatClean(iw)}A`,
        `磁化電流は無負荷電流の直角成分: Iμ=√(I0²−Iw²)=√(${formatClean(i0 * i0)}−${formatClean(iw * iw)})`,
        `=${answerText}A`,
      ],
      physicallyValid: true,
    };
  },
});
