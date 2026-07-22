/**
 * テンプレート: 変流器と過電流継電器の動作電流（二種一次・電力・numeric）。
 *   CT 比 n = 一次定格/5A の変流器に整定タップ It の過電流継電器を接続すると、
 *   継電器が動作し始める一次側電流は
 *     Iop = It × (一次定格/5) 〔A〕
 *   過去問頻出の「変流器」を、保護継電器の整定と組み合わせてひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const CT_SET: ReadonlyArray<number> = [50, 75, 100, 150, 200, 300, 400, 500, 600];
const TAP_SET: ReadonlyArray<number> = [2, 3, 4, 5, 6, 8];
/** CT 二次定格〔A〕（問題文に明示する定数）。 */
const CT_SECONDARY = 5;

type Params = {
  ct_primary: number;
  relay_tap: number;
};

export const currentTransformerRelay = defineTemplate<Params>({
  topic: "変流器と過電流継電器の動作電流",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "変電・変圧器", frequency: "mid", years: [2010, 2014, 2019, 2023] },
  paramSpecs: {
    ct_primary: { unit: "A", realistic_range: [20, 600] },
    relay_tap: { unit: "A", realistic_range: [2, 8] },
  },
  paramOrder: ["ct_primary", "relay_tap"],
  draw(rng) {
    return {
      ct_primary: pick(CT_SET, rng),
      relay_tap: pick(TAP_SET, rng),
    };
  },
  buildFrom({ ct_primary: ctPrimary, relay_tap: tap }) {
    if (ctPrimary <= 0 || tap <= 0) return null;
    const ratio = ctPrimary / CT_SECONDARY;
    const operatingCurrent = tap * ratio;
    if (!isCleanAnswer(ratio) || !isCleanAnswer(operatingCurrent)) return null;
    const answerText = formatClean(operatingCurrent);
    const ratioText = formatClean(ratio);
    return {
      format: "numeric",
      params: {
        ct_primary: { value: ctPrimary, unit: "A", realistic_range: [20, 600] },
        relay_tap: { value: tap, unit: "A", realistic_range: [2, 8] },
      },
      answerValue: operatingCurrent,
      answerUnit: "A",
      answerText,
      facts: { ctPrimary, tap, ratio, operatingCurrent },
      defaultStatement:
        `高圧配電線路に変流比 ${ctPrimary}/5A の変流器を設け、その二次側に過電流継電器を接続した。` +
        `継電器の電流整定タップを ${tap}A に整定したとき、継電器が動作し始める線路（一次側）の電流〔A〕を求めよ。`,
      defaultSolution: [
        `着眼点: CT 二次に整定値 It が流れるときの一次側電流を変流比で戻す。`,
        `変流比 n=${ctPrimary}/5=${ratioText}`,
        `Iop=It×n=${tap}×${ratioText}=${answerText}A`,
        `ポイント: 変流比を掛けるか割るかで迷ったら「一次電流は二次より大きい」で確かめる。`,
      ],
      physicallyValid: true,
    };
  },
});
