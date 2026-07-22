/**
 * テンプレート: 復水器の冷却水温度上昇（二種二次・電力管理・descriptive）。
 *   タービン室効率 η の汽力発電所（出力 P〔MW〕）で、復水器が捨てる熱量は
 *     Q = P·(1−η)/η 〔MW〕
 *   冷却水流量 q〔t/s〕・比熱 c=4.2kJ/(kg·K) のとき温度上昇は
 *     Δt = Q×10³ / (c·q×10³) = Q/(4.2·q) 〔K〕
 *   過去問頻出の「復水器の冷却水量」を、温度上昇を問う形にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const P_SET: ReadonlyArray<number> = [280, 420, 560, 630];
const ETA_SET: ReadonlyArray<number> = [0.4, 0.5];
const Q_SET: ReadonlyArray<number> = [10, 20, 25, 50];
/** 冷却水の比熱〔kJ/(kg·K)〕（問題文に明示する定数）。 */
const SPECIFIC_HEAT = 4.2;

type Params = {
  output_power: number;
  thermal_efficiency: number;
  water_flow: number;
};

export const condenserCoolingWater = defineTemplate<Params>({
  topic: "復水器の冷却水温度上昇",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "発電（水力・汽力）", frequency: "high", years: [2007, 2012, 2017, 2022] },
  paramSpecs: {
    output_power: { unit: "MW", realistic_range: [100, 1000] },
    thermal_efficiency: { unit: "", realistic_range: [0.3, 0.6] },
    water_flow: { unit: "t/s", realistic_range: [5, 60] },
  },
  paramOrder: ["output_power", "thermal_efficiency", "water_flow"],
  draw(rng) {
    return {
      output_power: pick(P_SET, rng),
      thermal_efficiency: pick(ETA_SET, rng),
      water_flow: pick(Q_SET, rng),
    };
  },
  buildFrom({ output_power: P, thermal_efficiency: eta, water_flow: q }) {
    if (P <= 0 || q <= 0) return null;
    if (eta <= 0 || eta >= 1) return null;
    const heatRejected = (P * (1 - eta)) / eta; // MW = MJ/s
    if (!isCleanAnswer(heatRejected)) return null;
    const deltaT = heatRejected / (SPECIFIC_HEAT * q); // (MJ/s)/(kJ/(kg·K)×10³kg/s) = K
    // 実機の復水器温度上昇（おおむね6〜8K、広めに見て3〜12K）の綺麗な値のみ採用。
    // 出力に対して流量が1桁小さいような非現実的な組（Δt>12K）はここで棄却される。
    if (deltaT < 3 || deltaT > 12 || !isCleanAnswer(deltaT)) return null;
    const answerText = formatClean(deltaT);
    const qr = formatClean(heatRejected);
    return {
      format: "descriptive",
      params: {
        output_power: { value: P, unit: "MW", realistic_range: [100, 1000] },
        thermal_efficiency: { value: eta, unit: "", realistic_range: [0.3, 0.6] },
        water_flow: { value: q, unit: "t/s", realistic_range: [5, 60] },
      },
      answerValue: deltaT,
      answerUnit: "K",
      answerText,
      facts: { P, eta, q, heatRejected, deltaT, specificHeat: SPECIFIC_HEAT },
      defaultStatement:
        `タービン室効率 ${eta} の汽力発電所が定格出力 ${P}MW で運転している。` +
        `タービン室で仕事にならなかった熱はすべて復水器で冷却水に捨てられ、` +
        `発電機効率などその他の損失は無視できるものとする。` +
        `冷却水の流量が ${q}t/s、比熱が 4.2kJ/(kg·K) のとき、冷却水の温度上昇 Δt〔K〕を求めよ。`,
      defaultSolution: [
        `着眼点: 復水器が受け持つ熱量は「入熱 − 出力」= P·(1−η)/η。`,
        `Q=${P}×(1−${eta})/${eta}=${qr}MW`,
        `冷却水 ${q}t/s = ${q}×10³kg/s が Δt だけ昇温して Q を持ち去る。`,
        `Δt=Q×10³/(4.2×${q}×10³)=${qr}/(4.2×${q})=${answerText}K`,
        `ポイント: 効率が低いほど捨てる熱が増え、同じ流量なら温度上昇が大きくなる。`,
      ],
      physicallyValid: true,
    };
  },
});
