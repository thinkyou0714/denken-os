/**
 * テンプレート: 送電効率（電力・numeric）。
 *   送電効率  η = 受電電力 / 送電電力 × 100 = Pr / (Pr + 損失) × 100   〔%〕
 *
 * 新規テンプレートはこの形（defineTemplate ファクトリ）を標準とする。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

// [受電電力 Pr, 送電電力 Ps]（η が綺麗）。
const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [95, 100],
  [90, 100],
  [96, 100],
  [475, 500],
  [950, 1000],
  [1900, 2000],
  [180, 200],
];

type Params = {
  received_power: number;
  sent_power: number;
};

export const transmissionEfficiency = defineTemplate<Params>({
  topic: "送電効率",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    received_power: { unit: "kW", realistic_range: [90, 2000] },
    sent_power: { unit: "kW", realistic_range: [100, 2000] },
  },
  paramOrder: ["received_power", "sent_power"],
  draw(rng) {
    const [Pr, Ps] = pick(PAIRS, rng);
    return {
      received_power: Pr,
      sent_power: Ps,
    };
  },
  buildFrom({ received_power: Pr, sent_power: Ps }) {
    if (Pr <= 0 || Ps <= 0 || Pr > Ps) return null;
    const eta = (Pr / Ps) * 100;
    if (!isCleanAnswer(eta)) return null;
    const answerText = formatClean(eta);
    const loss = Ps - Pr;
    return {
      format: "numeric",
      params: {
        received_power: { value: Pr, unit: "kW", realistic_range: [90, 2000] },
        sent_power: { value: Ps, unit: "kW", realistic_range: [100, 2000] },
      },
      answerValue: eta,
      answerUnit: "%",
      answerText,
      facts: { Pr, Ps, loss, eta },
      defaultStatement: `送電電力 Ps=${Ps}kW に対し、受電電力 Pr=${Pr}kW であった（線路損失 ${loss}kW）。送電効率 η〔%〕は?`,
      defaultSolution: [`送電効率 η=受電電力/送電電力×100`, `η=${Pr}/${Ps}×100`, `η=${answerText}%`],
      physicallyValid: true,
    };
  },
});
