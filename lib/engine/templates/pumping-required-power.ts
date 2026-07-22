/**
 * テンプレート: 揚水に必要な電動機入力（二種二次・電力管理・descriptive）。
 *   流量 Q〔m³/s〕・全揚程 H〔m〕をポンプ総合効率 ηp で揚水するのに必要な入力は
 *     P = 9.8·Q·H / ηp 〔kW〕（ρg=9.8 kN/m³）
 *   過去問頻出の「理論水力」を、揚水側（効率で割る向き）にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const Q_SET: ReadonlyArray<number> = [10, 20, 25, 40, 50, 70];
const H_SET: ReadonlyArray<number> = [100, 140, 200, 250];
const ETA_SET: ReadonlyArray<number> = [0.7, 0.8, 0.875];

type Params = {
  flow_rate: number;
  total_head: number;
  pump_efficiency: number;
};

export const pumpingRequiredPower = defineTemplate<Params>({
  topic: "揚水に必要な電動機入力",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "発電（水力・汽力）", frequency: "high", years: [2006, 2010, 2015, 2021] },
  paramSpecs: {
    flow_rate: { unit: "m³/s", realistic_range: [5, 100] },
    total_head: { unit: "m", realistic_range: [50, 600] },
    pump_efficiency: { unit: "", realistic_range: [0.6, 0.95] },
  },
  paramOrder: ["flow_rate", "total_head", "pump_efficiency"],
  draw(rng) {
    return {
      flow_rate: pick(Q_SET, rng),
      total_head: pick(H_SET, rng),
      pump_efficiency: pick(ETA_SET, rng),
    };
  },
  buildFrom({ flow_rate: q, total_head: h, pump_efficiency: eta }) {
    if (q <= 0 || h <= 0) return null;
    if (eta <= 0 || eta >= 1) return null;
    const theoretical = 9.8 * q * h; // kW（理論揚水動力）
    const inputKw = theoretical / eta;
    const inputMw = inputKw / 1000;
    if (!isCleanAnswer(theoretical) || !isCleanAnswer(inputMw)) return null;
    const answerText = formatClean(inputMw);
    const th = formatClean(theoretical);
    return {
      format: "descriptive",
      params: {
        flow_rate: { value: q, unit: "m³/s", realistic_range: [5, 100] },
        total_head: { value: h, unit: "m", realistic_range: [50, 600] },
        pump_efficiency: { value: eta, unit: "", realistic_range: [0.6, 0.95] },
      },
      answerValue: inputMw,
      answerUnit: "MW",
      answerText,
      facts: { q, h, eta, theoretical, inputMw },
      defaultStatement:
        `揚水発電所で、全揚程 ${h}m の上部貯水池へ流量 ${q}m³/s で揚水する。` +
        `ポンプ水車と電動機を合わせた揚水時の総合効率を ${eta} とするとき、` +
        `揚水に必要な電動機入力〔MW〕を求めよ。ただし水の単位体積重量は 9.8kN/m³ とする。`,
      defaultSolution: [
        `着眼点: 理論揚水動力は 9.8·Q·H〔kW〕。揚水では損失のぶん余計に必要なので効率で「割る」。`,
        `理論動力: 9.8×${q}×${h}=${th}kW`,
        `P=9.8·Q·H/ηp=${th}/${formatClean(eta, 3)}=${answerText}×10³kW`,
        `P=${answerText}MW`,
        `ポイント: 発電時は η を「掛ける」、揚水時は η で「割る」。向きの取り違えが典型ミス。`,
      ],
      physicallyValid: true,
    };
  },
});
