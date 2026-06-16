/**
 * テンプレート: 変圧器のタップ切換（電力・numeric）。
 *   二次電圧 V2 = (一次電圧 V1 / タップ電圧 Vt) × 二次定格電圧 V2n
 *   タップを上げると二次電圧は下がる（巻数比が増える）方向の理解を問う。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

/** (一次電圧, タップ電圧) — 比が綺麗になる組（6kV級配電用変圧器を想定）。 */
const V1_TAP_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [6600, 6000],
  [6300, 6000],
  [6000, 6000],
  [6600, 6600],
  [6900, 6900],
  [6600, 7500],
  [6000, 7500],
  [6900, 6000],
];
const V2N_SET: ReadonlyArray<number> = [105, 210, 420];

type Params = {
  primary_voltage: number;
  tap_voltage: number;
  secondary_rated: number;
};

export const transformerTap = defineTemplate<Params>({
  topic: "変圧器のタップ切換",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "変電・変圧器", frequency: "mid", years: [2010, 2016, 2022] },
  paramSpecs: {
    primary_voltage: { unit: "V", realistic_range: [5500, 7500] },
    tap_voltage: { unit: "V", realistic_range: [5500, 7700] },
    secondary_rated: { unit: "V", realistic_range: [100, 440] },
  },
  paramOrder: ["primary_voltage", "tap_voltage", "secondary_rated"],
  draw(rng) {
    const [v1, tap] = pick(V1_TAP_PAIRS, rng);
    return {
      primary_voltage: v1,
      tap_voltage: tap,
      secondary_rated: pick(V2N_SET, rng),
    };
  },
  buildFrom({ primary_voltage: v1, tap_voltage: tap, secondary_rated: v2n }) {
    if (v1 <= 0 || tap <= 0 || v2n <= 0) return null;
    const v2 = (v1 / tap) * v2n;
    if (!isCleanAnswer(v2)) return null;
    const answerText = formatClean(v2);
    return {
      format: "numeric",
      params: {
        primary_voltage: { value: v1, unit: "V", realistic_range: [5500, 7500] },
        tap_voltage: { value: tap, unit: "V", realistic_range: [5500, 7700] },
        secondary_rated: { value: v2n, unit: "V", realistic_range: [100, 440] },
      },
      answerValue: v2,
      answerUnit: "V",
      answerText,
      facts: { v1, tap, v2n, v2 },
      defaultStatement:
        `定格二次電圧 ${formatClean(v2n)}V の配電用変圧器で、タップ電圧 ${formatClean(tap)}V のタップを` +
        `使用している。一次電圧が ${formatClean(v1)}V のとき、二次電圧〔V〕は?`,
      defaultSolution: [
        `タップ使用時の二次電圧 V2=(V1/Vtap)×V2n（タップ電圧を上げると二次電圧は下がる）`,
        `=(${formatClean(v1)}/${formatClean(tap)})×${formatClean(v2n)}`,
        `=${answerText}V`,
      ],
      physicallyValid: true,
    };
  },
});
