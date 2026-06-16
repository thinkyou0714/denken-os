/**
 * テンプレート: 揚水ポンプの電動機入力（機械・numeric）。
 *   電動機入力  P = 9.8·Q·H / η   〔kW〕
 *     Q=揚水量〔m³/s〕, H=全揚程〔m〕, η=ポンプ＋電動機の総合効率
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const Q_SET: ReadonlyArray<number> = [1, 2, 4, 5, 10];
const H_SET: ReadonlyArray<number> = [20, 50, 100, 150, 200];
// 総合効率は現実的な範囲のみ（0.98 は綺麗な答えになるが物理的に非現実的なので除外）。
const ETA_SET: ReadonlyArray<number> = [0.7, 0.8];

type Params = {
  flow: number;
  head: number;
  efficiency: number;
};

export const pumpMotorInput = defineTemplate<Params>({
  topic: "揚水ポンプの電動機入力",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "電動機応用", frequency: "mid", years: [2010, 2015, 2020, 2025] },
  paramSpecs: {
    flow: { unit: "m3/s", realistic_range: [1, 10] },
    head: { unit: "m", realistic_range: [20, 200] },
    efficiency: { unit: "", realistic_range: [0.6, 0.9] },
  },
  paramOrder: ["flow", "head", "efficiency"],
  draw(rng) {
    return {
      flow: pick(Q_SET, rng),
      head: pick(H_SET, rng),
      efficiency: pick(ETA_SET, rng),
    };
  },
  buildFrom({ flow: Q, head: H, efficiency: eta }) {
    if (Q <= 0 || H <= 0 || eta <= 0 || eta > 1) return null;
    const P = (9.8 * Q * H) / eta;
    if (!isCleanAnswer(P)) return null;
    const answerText = formatClean(P);
    return {
      format: "numeric",
      params: {
        flow: { value: Q, unit: "m3/s", realistic_range: [1, 10] },
        head: { value: H, unit: "m", realistic_range: [20, 200] },
        efficiency: { value: eta, unit: "", realistic_range: [0.6, 0.9] },
      },
      answerValue: P,
      answerUnit: "kW",
      answerText,
      facts: { Q, H, eta, P },
      defaultStatement:
        `揚水量 Q=${Q}m³/s、全揚程 H=${H}m、総合効率 η=${eta} の揚水ポンプを駆動する。` +
        `電動機の入力 P〔kW〕を P=9.8QH/η により求めよ。`,
      defaultSolution: [
        `水動力 9.8QH を効率で割る（損失分だけ入力が増える）: P=9.8·Q·H/η`,
        `P=9.8×${Q}×${H}/${eta}`,
        `P=${answerText}kW`,
      ],
      physicallyValid: true,
    };
  },
});
