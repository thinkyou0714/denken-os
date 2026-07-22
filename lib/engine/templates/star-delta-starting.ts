/**
 * テンプレート: Y-Δ始動の始動電流（二種二次・機械制御・descriptive）。
 *   かご形誘導電動機を Y-Δ始動すると、各相巻線への印加電圧が 1/√3 になるため
 *   線電流・トルクとも全電圧（Δ）始動時の 1/3 になる:
 *     IY = k·In / 3 〔A〕（k: 全電圧始動電流の定格倍数, In: 定格電流）
 *   過去問頻出の「始動法と始動電流」を、定格倍数を振ってひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const IN_SET: ReadonlyArray<number> = [20, 30, 40, 60];
const K_SET: ReadonlyArray<number> = [5, 6, 7.5];

type Params = {
  rated_current: number;
  direct_ratio: number;
};

export const starDeltaStarting = defineTemplate<Params>({
  topic: "Y-Δ始動の始動電流",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "回転機の制御", frequency: "high", years: [2007, 2012, 2016, 2022] },
  paramSpecs: {
    rated_current: { unit: "A", realistic_range: [10, 100] },
    direct_ratio: { unit: "倍", realistic_range: [4, 8] },
  },
  paramOrder: ["rated_current", "direct_ratio"],
  draw(rng) {
    return {
      rated_current: pick(IN_SET, rng),
      direct_ratio: pick(K_SET, rng),
    };
  },
  buildFrom({ rated_current: iN, direct_ratio: k }) {
    if (iN <= 0 || k <= 1) return null;
    const directCurrent = k * iN;
    const starCurrent = directCurrent / 3;
    if (!isCleanAnswer(directCurrent) || !isCleanAnswer(starCurrent)) return null;
    const answerText = formatClean(starCurrent);
    const direct = formatClean(directCurrent);
    return {
      format: "descriptive",
      params: {
        rated_current: { value: iN, unit: "A", realistic_range: [10, 100] },
        direct_ratio: { value: k, unit: "倍", realistic_range: [4, 8] },
      },
      answerValue: starCurrent,
      answerUnit: "A",
      answerText,
      facts: { iN, k, directCurrent, starCurrent },
      defaultStatement:
        `定格電流 ${iN}A のかご形三相誘導電動機がある。全電圧始動時の始動電流は定格電流の ${k}倍である。` +
        `この電動機を Y-Δ始動したときの始動電流（線電流）〔A〕を求めよ。`,
      defaultSolution: [
        `着眼点: Y結線始動では各相巻線の電圧が 1/√3 になり、線電流は (1/√3)²=1/3 になる。`,
        `全電圧始動電流=${k}×${iN}=${direct}A`,
        `IY=${direct}/3=${answerText}A`,
        `（始動トルクも電圧の2乗に比例するため 1/3 になる）`,
        `ポイント: 電圧 1/√3 → 電流・トルクとも 1/3。「トルクは 1/√3」とする誤りが典型。`,
      ],
      physicallyValid: true,
    };
  },
});
