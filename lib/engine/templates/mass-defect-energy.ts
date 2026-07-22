/**
 * テンプレート: 質量欠損と発電電力量（二種一次・電力・numeric）。
 *   質量欠損 Δm〔g〕は E=Δm·c²（c=3×10⁸m/s）のエネルギーに相当し、
 *     E = Δm×10⁻³ × (3×10⁸)² = Δm×9×10¹³ J = Δm×2.5×10⁷ kW·h
 *   熱効率（熱→電気の変換効率）η を掛けて電気エネルギーに換算する。
 *   過去問頻出の「原子力発電のエネルギー」を、MW·h への単位換算まで通しでひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const DM_SET: ReadonlyArray<number> = [0.1, 0.2, 0.4, 0.5, 0.8, 1];
const ETA_SET: ReadonlyArray<number> = [0.3, 0.32, 0.35, 0.36, 0.4];
/** 1g の質量欠損に相当する電力量〔kW·h〕= 9×10¹³ / 3.6×10⁶。 */
const KWH_PER_GRAM = 2.5e7;

type Params = {
  mass_defect: number;
  thermal_efficiency: number;
};

export const massDefectEnergy = defineTemplate<Params>({
  topic: "質量欠損と発電電力量",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 4,
  pastExam: { area: "原子力・新エネルギー", frequency: "mid", years: [2008, 2013, 2019, 2024] },
  paramSpecs: {
    mass_defect: { unit: "g", realistic_range: [0.05, 2] },
    thermal_efficiency: { unit: "", realistic_range: [0.25, 0.45] },
  },
  paramOrder: ["mass_defect", "thermal_efficiency"],
  draw(rng) {
    return {
      mass_defect: pick(DM_SET, rng),
      thermal_efficiency: pick(ETA_SET, rng),
    };
  },
  buildFrom({ mass_defect: dm, thermal_efficiency: eta }) {
    if (dm <= 0) return null;
    if (eta <= 0 || eta >= 1) return null;
    const heatKwh = dm * KWH_PER_GRAM;
    const electricMwh = (heatKwh * eta) / 1000;
    if (!isCleanAnswer(heatKwh) || !isCleanAnswer(electricMwh)) return null;
    const answerText = formatClean(electricMwh);
    const heat = formatClean(heatKwh / 1e6, 3); // 表示は 10⁶kW·h 単位
    return {
      format: "numeric",
      params: {
        mass_defect: { value: dm, unit: "g", realistic_range: [0.05, 2] },
        thermal_efficiency: { value: eta, unit: "", realistic_range: [0.25, 0.45] },
      },
      answerValue: electricMwh,
      answerUnit: "MW·h",
      answerText,
      facts: { dm, eta, heatKwh, electricMwh },
      defaultStatement:
        `原子炉内の核分裂で ${dm}g の質量欠損が生じた。光速を 3×10⁸m/s、発生した熱エネルギーを` +
        `電気エネルギーへ変換する熱効率を ${eta} とするとき、得られる電力量〔MW·h〕を求めよ。`,
      defaultSolution: [
        `着眼点: E=Δm·c² を J で求め、3.6×10⁶J=1kW·h で電力量へ換算してから熱効率を掛ける。`,
        `E=${formatClean(dm)}×10⁻³×(3×10⁸)²=${formatClean(dm * 9, 2)}×10¹³J`,
        `熱量=${formatClean(dm * 9, 2)}×10¹³/3.6×10⁶=${heat}×10⁶kW·h`,
        `電力量=${heat}×10⁶×${formatClean(eta)}kW·h=${answerText}MW·h`,
        `ポイント: J→kW·h の 3.6×10⁶ と、質量の g→kg 換算。桁を落とすのが典型ミス。`,
      ],
      physicallyValid: true,
    };
  },
});
