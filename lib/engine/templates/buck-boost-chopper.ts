/**
 * テンプレート: 昇降圧チョッパの出力電圧（二種二次・機械制御・descriptive）。
 *   昇降圧（反転形）チョッパの平均出力電圧の大きさは、通流率 D に対して
 *     Vo = D/(1−D) × Vin 〔V〕（出力極性は入力と逆）
 *   過去問頻出の「昇圧・降圧チョッパ」を、昇降圧形（D<0.5 で降圧・D>0.5 で昇圧）に
 *   発展させた改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const VIN_SET: ReadonlyArray<number> = [100, 200, 240];
const D_SET: ReadonlyArray<number> = [0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8];

type Params = {
  input_voltage: number;
  duty_ratio: number;
};

export const buckBoostChopper = defineTemplate<Params>({
  topic: "昇降圧チョッパの出力電圧",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "パワーエレクトロニクス", frequency: "high", years: [2010, 2015, 2020, 2025] },
  paramSpecs: {
    input_voltage: { unit: "V", realistic_range: [50, 400] },
    duty_ratio: { unit: "", realistic_range: [0.1, 0.9] },
  },
  paramOrder: ["input_voltage", "duty_ratio"],
  draw(rng) {
    return {
      input_voltage: pick(VIN_SET, rng),
      duty_ratio: pick(D_SET, rng),
    };
  },
  buildFrom({ input_voltage: vin, duty_ratio: d }) {
    if (vin <= 0) return null;
    if (d <= 0 || d >= 1) return null;
    const vo = (vin * d) / (1 - d);
    if (vo <= 0 || !isCleanAnswer(vo)) return null;
    const answerText = formatClean(vo);
    const ratio = d / (1 - d);
    return {
      format: "descriptive",
      params: {
        input_voltage: { value: vin, unit: "V", realistic_range: [50, 400] },
        duty_ratio: { value: d, unit: "", realistic_range: [0.1, 0.9] },
      },
      answerValue: vo,
      answerUnit: "V",
      answerText,
      facts: { vin, d, ratio, vo },
      defaultStatement:
        `入力電圧 ${vin}V の昇降圧チョッパ（反転形）を通流率 D=${d} で運転する。` +
        `リアクトル電流は連続とし、素子の損失は無視できるものとして、` +
        `平均出力電圧の大きさ Vo〔V〕を求めよ。`,
      defaultSolution: [
        `着眼点: 定常状態ではリアクトルの電圧時間積が釣り合う: Vin·DT=Vo·(1−D)T。`,
        `Vo=Vin×D/(1−D)`,
        `Vo=${vin}×${formatClean(d)}/(1−${formatClean(d)})=${answerText}V`,
        `（D<0.5 なら降圧、D>0.5 なら昇圧として働き、出力極性は入力と逆になる）`,
        `ポイント: 昇圧チョッパの 1/(1−D) 倍、降圧チョッパの D 倍と混同しないこと。`,
      ],
      physicallyValid: true,
    };
  },
});
