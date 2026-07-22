/**
 * テンプレート: 所内率と送電端熱効率（二種二次・電力管理・descriptive）。
 *   発電端熱効率 ηg の汽力発電所で所内率（所内電力比率）が L のとき、
 *     送電端熱効率 ηs = ηg × (1−L) 〔%〕
 *   過去問頻出の「汽力発電の熱効率」を、発電端/送電端の区別でひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

/** 発電端熱効率〔%〕（整数のみ: 所内率(2桁小数)との積が必ず綺麗な値になる）。 */
const ETA_SET: ReadonlyArray<number> = [36, 38, 40, 42, 44, 45, 48, 50];
const L_SET: ReadonlyArray<number> = [0.03, 0.04, 0.05, 0.06, 0.08];

type Params = {
  generator_end_efficiency: number;
  station_service_rate: number;
};

export const stationServiceEfficiency = defineTemplate<Params>({
  topic: "所内率と送電端熱効率",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "発電（水力・汽力）", frequency: "high", years: [2008, 2013, 2018, 2024] },
  paramSpecs: {
    generator_end_efficiency: { unit: "%", realistic_range: [30, 60] },
    station_service_rate: { unit: "", realistic_range: [0.02, 0.1] },
  },
  paramOrder: ["generator_end_efficiency", "station_service_rate"],
  draw(rng) {
    return {
      generator_end_efficiency: pick(ETA_SET, rng),
      station_service_rate: pick(L_SET, rng),
    };
  },
  buildFrom({ generator_end_efficiency: etaG, station_service_rate: l }) {
    if (etaG <= 0 || etaG >= 100) return null;
    if (l <= 0 || l >= 1) return null;
    const etaS = etaG * (1 - l);
    if (etaS <= 0 || !isCleanAnswer(etaS)) return null;
    const answerText = formatClean(etaS);
    return {
      format: "descriptive",
      params: {
        generator_end_efficiency: { value: etaG, unit: "%", realistic_range: [30, 60] },
        station_service_rate: { value: l, unit: "", realistic_range: [0.02, 0.1] },
      },
      answerValue: etaS,
      answerUnit: "%",
      answerText,
      facts: { etaG, l, etaS },
      defaultStatement:
        `発電端熱効率 ${etaG}% の汽力発電所がある。発電電力量のうち所内率 ${l} に相当する電力を` +
        `所内動力（給水ポンプ・通風機など）として消費するとき、送電端熱効率〔%〕を求めよ。`,
      defaultSolution: [
        `着眼点: 送電端で外へ出せるのは発電電力量の (1−所内率) 倍。熱効率も同じ比で目減りする。`,
        `ηs=ηg×(1−L)=${etaG}×(1−${formatClean(l, 3)})`,
        `ηs=${answerText}%`,
        `ポイント: 所内率は「発電電力量に対する所内消費の比」。燃料側に掛ける誤りが典型。`,
      ],
      physicallyValid: true,
    };
  },
});
