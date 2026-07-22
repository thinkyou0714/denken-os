/**
 * テンプレート: 日負荷曲線と負荷率（二種二次・電力管理・descriptive）。
 *   階段状の日負荷曲線（夜間/昼間/ピークの3区間）から
 *     1日の需要電力量 W = Σ(電力×時間)〔MWh〕
 *     平均需要電力 = W/24、負荷率 = 平均/最大 × 100〔%〕
 *   を求める。過去問頻出の「日負荷曲線から負荷率」を、区間パターンを変えてひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

/** ピーク8時間パターン（0-8時:夜間 / 8-16時:昼間 / 16-24時:ピーク）の [夜間,昼間,ピーク] MW。 */
const TRIPLES_PEAK8: ReadonlyArray<readonly [number, number, number]> = [
  [20, 100, 150],
  [40, 80, 150],
  [20, 60, 100],
  [40, 120, 200],
  [60, 100, 200],
  [40, 60, 200],
];
/** ピーク4時間パターン（0-8時:夜間 / 8-20時:昼間 / 20-24時:ピーク）の [夜間,昼間,ピーク] MW。 */
const TRIPLES_PEAK4: ReadonlyArray<readonly [number, number, number]> = [
  [20, 80, 200],
  [20, 100, 200],
  [20, 120, 200],
  [60, 120, 150],
];
const SCALE_SET: ReadonlyArray<number> = [1, 2];

type Params = {
  night_power: number;
  day_power: number;
  peak_power: number;
  peak_hours: number;
};

export const dailyLoadFactor = defineTemplate<Params>({
  topic: "日負荷曲線と負荷率",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "配電・需要損失", frequency: "mid", years: [2009, 2014, 2018, 2023] },
  paramSpecs: {
    night_power: { unit: "MW", realistic_range: [10, 400] },
    day_power: { unit: "MW", realistic_range: [10, 400] },
    peak_power: { unit: "MW", realistic_range: [50, 500] },
    peak_hours: { unit: "h", realistic_range: [4, 8] },
  },
  paramOrder: ["night_power", "day_power", "peak_power", "peak_hours"],
  draw(rng) {
    const peakHours = pick([8, 4] as const, rng);
    const triple = pick(peakHours === 8 ? TRIPLES_PEAK8 : TRIPLES_PEAK4, rng);
    const scale = pick(SCALE_SET, rng);
    return {
      night_power: triple[0] * scale,
      day_power: triple[1] * scale,
      peak_power: triple[2] * scale,
      peak_hours: peakHours,
    };
  },
  buildFrom({ night_power: p1, day_power: p2, peak_power: p3, peak_hours: peakH }) {
    if (p1 <= 0 || p2 <= 0 || p3 <= 0) return null;
    if (peakH !== 8 && peakH !== 4) return null;
    // ピークが最大となる形状のみ採用（負荷率 = 平均/最大 の「最大」を一意にする）。
    if (p1 >= p3 || p2 >= p3) return null;
    const dayH = 16 - peakH; // 夜間8h + 昼間 + ピーク = 24h
    const energy = 8 * p1 + dayH * p2 + peakH * p3; // MWh
    const average = energy / 24;
    const loadFactor = (average / p3) * 100;
    if (!isCleanAnswer(energy) || !isCleanAnswer(average) || !isCleanAnswer(loadFactor)) return null;
    const answerText = formatClean(loadFactor);
    const w = formatClean(energy);
    const avg = formatClean(average);
    return {
      format: "descriptive",
      params: {
        night_power: { value: p1, unit: "MW", realistic_range: [10, 400] },
        day_power: { value: p2, unit: "MW", realistic_range: [10, 400] },
        peak_power: { value: p3, unit: "MW", realistic_range: [50, 500] },
        peak_hours: { value: peakH, unit: "h", realistic_range: [4, 8] },
      },
      answerValue: loadFactor,
      answerUnit: "%",
      answerText,
      facts: { p1, p2, p3, peakH, dayH, energy, average, loadFactor },
      defaultStatement:
        `ある系統の日負荷曲線は、0時〜8時が ${p1}MW、8時〜${8 + dayH}時が ${p2}MW、` +
        `${8 + dayH}時〜24時（${peakH}時間）が ${p3}MW の階段状で近似できる。` +
        `この日の需要電力量〔MWh〕を計算した上で、日負荷率〔%〕を求めよ。`,
      defaultSolution: [
        `着眼点: 負荷率 = 平均需要電力/最大需要電力。まず日需要電力量を積算する。`,
        `W=8×${p1}+${dayH}×${p2}+${peakH}×${p3}=${w}MWh`,
        `平均需要電力=W/24=${avg}MW、最大需要電力=${p3}MW`,
        `負荷率=${avg}/${p3}×100=${answerText}%`,
        `ポイント: 区間幅が変わっても「電力量→平均→最大で割る」の手順は不変。`,
      ],
      physicallyValid: true,
    };
  },
});
