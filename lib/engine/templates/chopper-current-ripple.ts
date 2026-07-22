/**
 * テンプレート: 降圧チョッパのリアクトル電流リプル（二種二次・機械制御・descriptive）。
 *   オン期間中リアクトルには Vin−Vo が加わり、D=Vo/Vin、周期 T=1/f なので
 *     ΔI = (Vin−Vo)·D·T/L = (Vin−Vo)·D/(L·f) 〔A〕（電流連続モード）
 *   過去問頻出の「降圧チョッパの出力電圧」を、リプル電流の設計計算にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const VIN_SET: ReadonlyArray<number> = [100, 200, 400];
const D_SET: ReadonlyArray<number> = [0.25, 0.4, 0.5, 0.6, 0.75];
/** インダクタンス〔mH〕。 */
const L_SET: ReadonlyArray<number> = [0.5, 1, 2, 4];
/** スイッチング周波数〔kHz〕。 */
const F_SET: ReadonlyArray<number> = [5, 10, 20];

type Params = {
  input_voltage: number;
  duty_ratio: number;
  inductance: number;
  switching_frequency: number;
};

export const chopperCurrentRipple = defineTemplate<Params>({
  topic: "降圧チョッパの電流リプル",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 5,
  pastExam: { area: "パワーエレクトロニクス", frequency: "high", years: [2011, 2016, 2021, 2025] },
  paramSpecs: {
    input_voltage: { unit: "V", realistic_range: [50, 600] },
    duty_ratio: { unit: "", realistic_range: [0.1, 0.9] },
    inductance: { unit: "mH", realistic_range: [0.2, 10] },
    switching_frequency: { unit: "kHz", realistic_range: [1, 50] },
  },
  paramOrder: ["input_voltage", "duty_ratio", "inductance", "switching_frequency"],
  draw(rng) {
    return {
      input_voltage: pick(VIN_SET, rng),
      duty_ratio: pick(D_SET, rng),
      inductance: pick(L_SET, rng),
      switching_frequency: pick(F_SET, rng),
    };
  },
  buildFrom({ input_voltage: vin, duty_ratio: d, inductance: lMh, switching_frequency: fKhz }) {
    if (vin <= 0 || lMh <= 0 || fKhz <= 0) return null;
    if (d <= 0 || d >= 1) return null;
    const vo = vin * d;
    if (!isCleanAnswer(vo)) return null;
    // (V)·(1)/(H·Hz) = A。L[mH]×f[kHz] = L[H]×f[Hz]/1 のスケールが打ち消し合う。
    const ripple = ((vin - vo) * d) / (lMh * fKhz);
    // 実設計で扱うリプル幅（0.5〜30A 程度）の綺麗な値のみ採用。
    if (ripple < 0.5 || ripple > 30 || !isCleanAnswer(ripple)) return null;
    const answerText = formatClean(ripple);
    const voText = formatClean(vo);
    return {
      format: "descriptive",
      params: {
        input_voltage: { value: vin, unit: "V", realistic_range: [50, 600] },
        duty_ratio: { value: d, unit: "", realistic_range: [0.1, 0.9] },
        inductance: { value: lMh, unit: "mH", realistic_range: [0.2, 10] },
        switching_frequency: { value: fKhz, unit: "kHz", realistic_range: [1, 50] },
      },
      answerValue: ripple,
      answerUnit: "A",
      answerText,
      facts: { vin, d, lMh, fKhz, vo, ripple },
      defaultStatement:
        `入力電圧 ${vin}V の降圧チョッパを、通流率 ${d}、スイッチング周波数 ${fKhz}kHz で運転する。` +
        `平滑リアクトルのインダクタンスは ${lMh}mH、リアクトル電流は連続で、出力電圧は一定とみなせる。` +
        `リアクトル電流のリプル幅 ΔI〔A〕を求めよ。`,
      defaultSolution: [
        `着眼点: オン期間 D·T の間、リアクトルには Vin−Vo が加わり電流が直線的に増える。`,
        `出力電圧: Vo=D·Vin=${voText}V`,
        `ΔI=(Vin−Vo)·D/(L·f)=(${vin}−${voText})×${formatClean(d)}/(${formatClean(lMh)}×10⁻³×${fKhz}×10³)`,
        `ΔI=${answerText}A`,
        `ポイント: リプルは L と f に反比例。周波数を上げるほどリアクトルを小さくできる。`,
      ],
      physicallyValid: true,
    };
  },
});
