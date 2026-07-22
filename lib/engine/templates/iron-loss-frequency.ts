/**
 * テンプレート: 電圧一定で周波数が変わったときの鉄損（二種一次・機械・numeric）。
 *   最大磁束密度 Bm ∝ V/f のため、電圧一定で周波数 f1→f2 になると
 *     ヒステリシス損 Ph ∝ f·Bm² ∝ V²/f  →  Ph2 = Ph1×(f1/f2)
 *     渦電流損     Pe ∝ f²·Bm² ∝ V²   →  Pe2 = Pe1（不変）
 *     鉄損合計 Pi2 = Ph1·(f1/f2) + Pe1 〔W〕
 *   過去問頻出の「変圧器の損失」を、周波数依存性（50/60Hz転用）にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

/** [f1, f2] の組（50↔60Hz の転用）。 */
const F_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [50, 60],
  [60, 50],
];
const PH_SET: ReadonlyArray<number> = [120, 180, 240, 300, 600];
const PE_SET: ReadonlyArray<number> = [100, 200, 250, 400];

type Params = {
  freq_before: number;
  freq_after: number;
  hysteresis_loss: number;
  eddy_loss: number;
};

export const ironLossFrequency = defineTemplate<Params>({
  topic: "周波数変更後の鉄損",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 4,
  pastExam: { area: "変圧器", frequency: "mid", years: [2009, 2014, 2020] },
  paramSpecs: {
    freq_before: { unit: "Hz", realistic_range: [50, 60] },
    freq_after: { unit: "Hz", realistic_range: [50, 60] },
    hysteresis_loss: { unit: "W", realistic_range: [50, 1000] },
    eddy_loss: { unit: "W", realistic_range: [50, 600] },
  },
  paramOrder: ["freq_before", "freq_after", "hysteresis_loss", "eddy_loss"],
  draw(rng) {
    const [f1, f2] = pick(F_PAIRS, rng);
    return {
      freq_before: f1,
      freq_after: f2,
      hysteresis_loss: pick(PH_SET, rng),
      eddy_loss: pick(PE_SET, rng),
    };
  },
  buildFrom({ freq_before: f1, freq_after: f2, hysteresis_loss: ph1, eddy_loss: pe1 }) {
    if (f1 <= 0 || f2 <= 0 || ph1 <= 0 || pe1 <= 0) return null;
    if (f1 === f2) return null;
    const ph2 = (ph1 * f1) / f2;
    const total = ph2 + pe1;
    if (!isCleanAnswer(ph2) || !isCleanAnswer(total)) return null;
    const answerText = formatClean(total);
    const ph2Text = formatClean(ph2);
    return {
      format: "numeric",
      params: {
        freq_before: { value: f1, unit: "Hz", realistic_range: [50, 60] },
        freq_after: { value: f2, unit: "Hz", realistic_range: [50, 60] },
        hysteresis_loss: { value: ph1, unit: "W", realistic_range: [50, 1000] },
        eddy_loss: { value: pe1, unit: "W", realistic_range: [50, 600] },
      },
      answerValue: total,
      answerUnit: "W",
      answerText,
      facts: { f1, f2, ph1, pe1, ph2, total },
      defaultStatement:
        `定格 ${f1}Hz の変圧器を電圧一定のまま ${f2}Hz の系統で使用する。${f1}Hz でのヒステリシス損は` +
        ` ${ph1}W、渦電流損は ${pe1}W であった。${f2}Hz における鉄損の合計〔W〕を求めよ。` +
        `ただし最大磁束密度は電圧に比例し周波数に反比例するものとする。`,
      defaultSolution: [
        `着眼点: V一定なら Bm∝1/f。Ph∝f·Bm²∝1/f、Pe∝f²·Bm²=一定 と整理できる。`,
        `ヒステリシス損: Ph2=${ph1}×${f1}/${f2}=${ph2Text}W`,
        `渦電流損: Pe2=${pe1}W（変わらない）`,
        `鉄損合計=${ph2Text}+${pe1}=${answerText}W`,
        `ポイント: 「渦電流損は周波数によらない（電圧一定のとき）」が最大の落とし穴。`,
      ],
      physicallyValid: true,
    };
  },
});
