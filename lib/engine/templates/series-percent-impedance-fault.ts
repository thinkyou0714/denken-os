/**
 * テンプレート: 基準容量換算と三相短絡容量（二種二次・電力管理・descriptive）。
 *   基準容量 Pb=10MV·A に対し、電源側 %ZS（10MV·A 基準）と変圧器 %ZT（自己容量基準）を
 *     %ZT(10MV·A) = %ZT × Pb/PT
 *   で換算・直列合成し、受電点の三相短絡容量を
 *     PS = Pb × 100 / (%ZS + %ZT(10MV·A)) 〔MV·A〕
 *   で求める。過去問頻出の「%Z の容量換算」と「短絡容量」を1問に束ねた複合改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

/** 基準容量〔MV·A〕（問題文に明示する定数）。 */
const BASE_MVA = 10;
const ZS_SET: ReadonlyArray<number> = [1, 1.25, 2, 2.5, 4, 5];
const ZT_SET: ReadonlyArray<number> = [2.5, 3, 4.5, 5, 6, 7.5, 9];
const PT_SET: ReadonlyArray<number> = [2, 2.5, 4, 5];

type Params = {
  source_impedance: number;
  transformer_impedance: number;
  transformer_capacity: number;
};

export const seriesPercentImpedanceFault = defineTemplate<Params>({
  topic: "基準容量換算と三相短絡容量",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "短絡・故障計算", frequency: "high", years: [2006, 2011, 2016, 2020, 2025] },
  paramSpecs: {
    source_impedance: { unit: "%", realistic_range: [0.5, 10] },
    transformer_impedance: { unit: "%", realistic_range: [2, 10] },
    transformer_capacity: { unit: "MV·A", realistic_range: [1, 10] },
  },
  paramOrder: ["source_impedance", "transformer_impedance", "transformer_capacity"],
  draw(rng) {
    return {
      source_impedance: pick(ZS_SET, rng),
      transformer_impedance: pick(ZT_SET, rng),
      transformer_capacity: pick(PT_SET, rng),
    };
  },
  buildFrom({ source_impedance: zS, transformer_impedance: zT, transformer_capacity: pT }) {
    if (zS <= 0 || zT <= 0 || pT <= 0) return null;
    const zTBase = (zT * BASE_MVA) / pT; // 自己容量基準 → 10MV·A 基準
    const zTotal = zS + zTBase;
    if (zTotal <= 0) return null;
    const shortCircuitMva = (BASE_MVA * 100) / zTotal;
    if (!isCleanAnswer(zTBase) || !isCleanAnswer(zTotal) || !isCleanAnswer(shortCircuitMva)) return null;
    const answerText = formatClean(shortCircuitMva);
    const ztb = formatClean(zTBase);
    const zt = formatClean(zTotal);
    return {
      format: "descriptive",
      params: {
        source_impedance: { value: zS, unit: "%", realistic_range: [0.5, 10] },
        transformer_impedance: { value: zT, unit: "%", realistic_range: [2, 10] },
        transformer_capacity: { value: pT, unit: "MV·A", realistic_range: [1, 10] },
      },
      answerValue: shortCircuitMva,
      answerUnit: "MV·A",
      answerText,
      facts: { zS, zT, pT, baseMva: BASE_MVA, zTBase, zTotal, shortCircuitMva },
      defaultStatement:
        `受電点から見た電源側の百分率インピーダンスは 10MV·A 基準で ${zS}% である。` +
        `この受電点に定格容量 ${pT}MV·A、自己容量基準 ${zT}% の変圧器を介して負荷設備を接続する。` +
        `変圧器二次側母線における三相短絡容量 PS〔MV·A〕を求めよ。`,
      defaultSolution: [
        `着眼点: %Z は同一基準容量に換算してからでないと加算できない。`,
        `変圧器分を 10MV·A 基準へ換算: %ZT=${zT}×10/${pT}=${ztb}%`,
        `直列合成: %Z=${zS}+${ztb}=${zt}%`,
        `PS=Pb×100/%Z=10×100/${zt}=${answerText}MV·A`,
        `ポイント: 基準容量をそろえ忘れて自己容量基準のまま加算するのが典型ミス。`,
      ],
      physicallyValid: true,
    };
  },
});
