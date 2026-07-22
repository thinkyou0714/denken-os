/**
 * テンプレート: ヒートポンプの成績係数と消費電力（二種一次・機械・numeric）。
 *   成績係数（COP）= 加熱能力 Q / 消費電力 P より
 *     P = Q / COP 〔kW〕
 *   過去問頻出の「電気加熱」を、抵抗加熱との比較でひねった改作
 *   （同じ加熱能力を抵抗加熱でまかなうと P=Q が必要になる点が学習ポイント）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const Q_SET: ReadonlyArray<number> = [6, 8, 9, 10, 12, 15, 16, 18, 20, 24];
const COP_SET: ReadonlyArray<number> = [2.5, 3, 4, 5, 6, 8];

type Params = {
  heat_output: number;
  cop: number;
};

export const heatPumpCop = defineTemplate<Params>({
  topic: "ヒートポンプの消費電力",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "電熱・電気化学", frequency: "mid", years: [2011, 2016, 2022] },
  paramSpecs: {
    heat_output: { unit: "kW", realistic_range: [3, 30] },
    cop: { unit: "", realistic_range: [2, 8] },
  },
  paramOrder: ["heat_output", "cop"],
  draw(rng) {
    return {
      heat_output: pick(Q_SET, rng),
      cop: pick(COP_SET, rng),
    };
  },
  buildFrom({ heat_output: q, cop }) {
    if (q <= 0 || cop <= 1) return null; // COP≤1 ならヒートポンプの意味がない
    const power = q / cop;
    if (power <= 0 || !isCleanAnswer(power)) return null;
    const answerText = formatClean(power);
    return {
      format: "numeric",
      params: {
        heat_output: { value: q, unit: "kW", realistic_range: [3, 30] },
        cop: { value: cop, unit: "", realistic_range: [2, 8] },
      },
      answerValue: power,
      answerUnit: "kW",
      answerText,
      facts: { q, cop, power },
      defaultStatement:
        `暖房負荷 ${q}kW の建物を、成績係数（COP）${cop} のヒートポンプで暖房する。` +
        `ヒートポンプの消費電力〔kW〕を求めよ。`,
      defaultSolution: [
        `着眼点: COP=加熱能力/消費電力。熱の一部を外気から汲み上げるため COP>1 にできる。`,
        `P=Q/COP=${q}/${cop}=${answerText}kW`,
        `（同じ ${q}kW を抵抗加熱でまかなうと消費電力はそのまま ${q}kW 必要になる）`,
        `ポイント: COP を乗じてしまう（P=Q×COP）のが典型ミス。定義に立ち返ること。`,
      ],
      physicallyValid: true,
    };
  },
});
