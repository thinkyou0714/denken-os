/**
 * テンプレート: 水車の比速度（電力・numeric）。
 *   Ns = N·P^(1/2) / H^(5/4)〔m·kW〕（N: 回転速度rpm, P: 出力kW, H: 有効落差m）
 *   H^(5/4)・√P が整数になる組に限定して綺麗な値を担保する。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

/** (H, P, N) — H^1.25 と √P が整数で、Ns が綺麗になる組。 */
const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [16, 100, 320], // 32, 10 → Ns=100
  [16, 100, 640], // → 200
  [16, 400, 320], // → 200
  [16, 400, 480], // → 300
  [16, 900, 320], // → 300
  [16, 900, 480], // → 450
  [16, 400, 160], // → 100
  [16, 2500, 128], // 50 → 200
  [625, 2500, 750], // 3125, 50 → 12
  [625, 10000, 375], // 100 → 12
];

type Params = {
  head: number;
  power: number;
  speed: number;
};

export const specificSpeed = defineTemplate<Params>({
  topic: "水車の比速度",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 4,
  pastExam: { area: "水力発電", frequency: "high", years: [2007, 2012, 2018, 2023] },
  paramSpecs: {
    head: { unit: "m", realistic_range: [10, 800] },
    power: { unit: "kW", realistic_range: [50, 20000] },
    speed: { unit: "min^-1", realistic_range: [100, 1200] },
  },
  paramOrder: ["head", "power", "speed"],
  draw(rng) {
    const [h, p, n] = pick(TRIPLES, rng);
    return { head: h, power: p, speed: n };
  },
  buildFrom({ head, power, speed }) {
    if (head <= 0 || power <= 0 || speed <= 0) return null;
    const ns = (speed * Math.sqrt(power)) / head ** 1.25;
    if (!isCleanAnswer(ns)) return null;
    const answerText = formatClean(ns);
    return {
      format: "numeric",
      params: {
        head: { value: head, unit: "m", realistic_range: [10, 800] },
        power: { value: power, unit: "kW", realistic_range: [50, 20000] },
        speed: { value: speed, unit: "min^-1", realistic_range: [100, 1200] },
      },
      answerValue: ns,
      answerUnit: "m・kW",
      answerText,
      facts: { head, power, speed, ns },
      defaultStatement:
        `有効落差 ${formatClean(head)}m、出力 ${formatClean(power)}kW、回転速度 ${formatClean(speed)}min⁻¹ の` +
        `水車の比速度〔m・kW〕は?`,
      defaultSolution: [
        `比速度 Ns=N·P^(1/2)/H^(5/4)`,
        `=${formatClean(speed)}×√${formatClean(power)}/${formatClean(head)}^1.25` +
          `（√${formatClean(power)}=${formatClean(Math.sqrt(power))}, ${formatClean(head)}^1.25=${formatClean(head ** 1.25)}）`,
        `=${answerText}m・kW`,
      ],
      physicallyValid: true,
    };
  },
});
