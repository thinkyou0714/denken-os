/**
 * テンプレート: 和動・差動接続と相互インダクタンス（二種一次・理論・numeric）。
 *   結合した2コイルの直列合成インダクタンスは
 *     和動接続: La = L1+L2+2M、差動接続: Lb = L1+L2−2M
 *   両者の差から M = (La−Lb)/4 〔mH〕
 *   過去問頻出の「相互インダクタンス」を、接続替え実験から逆算する形にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const LA_SET: ReadonlyArray<number> = [30, 40, 50, 60, 70, 80, 90, 100, 120];
const LB_SET: ReadonlyArray<number> = [10, 15, 20, 25, 30, 40, 50];

type Params = {
  series_aiding: number;
  series_opposing: number;
};

export const coupledInductorConnection = defineTemplate<Params>({
  topic: "和動・差動接続と相互インダクタンス",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "電磁気", frequency: "high", years: [2006, 2011, 2016, 2022] },
  paramSpecs: {
    series_aiding: { unit: "mH", realistic_range: [20, 150] },
    series_opposing: { unit: "mH", realistic_range: [5, 100] },
  },
  paramOrder: ["series_aiding", "series_opposing"],
  draw(rng) {
    return {
      series_aiding: pick(LA_SET, rng),
      series_opposing: pick(LB_SET, rng),
    };
  },
  buildFrom({ series_aiding: la, series_opposing: lb }) {
    if (la <= 0 || lb <= 0) return null;
    if (lb >= la) return null; // 和動 > 差動 が物理的前提（M>0）
    const mutual = (la - lb) / 4;
    if (mutual <= 0 || !isCleanAnswer(mutual)) return null;
    const answerText = formatClean(mutual);
    return {
      format: "numeric",
      params: {
        series_aiding: { value: la, unit: "mH", realistic_range: [20, 150] },
        series_opposing: { value: lb, unit: "mH", realistic_range: [5, 100] },
      },
      answerValue: mutual,
      answerUnit: "mH",
      answerText,
      facts: { la, lb, mutual },
      defaultStatement:
        `結合した2つのコイルを直列接続してインダクタンスを測定したところ、和動接続では ${la}mH、` +
        `接続を入れ替えた差動接続では ${lb}mH であった。2コイル間の相互インダクタンス M〔mH〕を求めよ。`,
      defaultSolution: [
        `着眼点: La=L1+L2+2M、Lb=L1+L2−2M。引き算で L1+L2 を消去できる。`,
        `La−Lb=4M`,
        `M=(${la}−${lb})/4=${answerText}mH`,
        `ポイント: 差を2で割る（2Mのつもり）誤りが典型。和動と差動の差は 4M である。`,
      ],
      physicallyValid: true,
    };
  },
});
