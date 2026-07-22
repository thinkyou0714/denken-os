/**
 * テンプレート: 交流ブリッジによるインダクタンス測定（二種一次・理論・numeric）。
 *   マクスウェルブリッジの平衡条件（対辺インピーダンスの積が等しい）から
 *     Lx = R2·R3·C4 〔H〕
 *   過去問頻出の「ブリッジの平衡条件」を、直流のホイートストンから交流ブリッジに
 *   ひねった改作（誤って対辺の比をとるのが典型ミス）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const R2_SET: ReadonlyArray<number> = [100, 200, 250, 400, 500, 1000, 2000];
const R3_SET: ReadonlyArray<number> = [50, 100, 200, 250, 500];
const C4_SET: ReadonlyArray<number> = [0.1, 0.2, 0.25, 0.4, 0.5, 1, 2];

type Params = {
  resistance_p: number;
  resistance_q: number;
  capacitance: number;
};

export const acBridgeBalance = defineTemplate<Params>({
  topic: "交流ブリッジのインダクタンス測定",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 4,
  pastExam: { area: "電気計測", frequency: "mid", years: [2008, 2014, 2019, 2024] },
  paramSpecs: {
    resistance_p: { unit: "Ω", realistic_range: [50, 2000] },
    resistance_q: { unit: "Ω", realistic_range: [50, 1000] },
    capacitance: { unit: "μF", realistic_range: [0.05, 2] },
  },
  paramOrder: ["resistance_p", "resistance_q", "capacitance"],
  draw(rng) {
    return {
      resistance_p: pick(R2_SET, rng),
      resistance_q: pick(R3_SET, rng),
      capacitance: pick(C4_SET, rng),
    };
  },
  buildFrom({ resistance_p: r2, resistance_q: r3, capacitance: c4 }) {
    if (r2 <= 0 || r3 <= 0 || c4 <= 0) return null;
    const lxMh = (r2 * r3 * c4) / 1000; // Ω·Ω·μF = μH → /1000 で mH
    if (lxMh < 1 || lxMh > 1000) return null; // 測定器として現実的なレンジのみ
    if (!isCleanAnswer(lxMh)) return null;
    const answerText = formatClean(lxMh);
    return {
      format: "numeric",
      params: {
        resistance_p: { value: r2, unit: "Ω", realistic_range: [50, 2000] },
        resistance_q: { unit: "Ω", value: r3, realistic_range: [50, 1000] },
        capacitance: { value: c4, unit: "μF", realistic_range: [0.05, 2] },
      },
      answerValue: lxMh,
      answerUnit: "mH",
      answerText,
      facts: { r2, r3, c4, lxMh },
      defaultStatement:
        `未知のインダクタンス Lx（内部抵抗あり）を測るマクスウェルブリッジが平衡している。` +
        `Lx と対辺に標準コンデンサ ${c4}μF（並列抵抗付き）、残る2辺に ${r2}Ω と ${r3}Ω の` +
        `無誘導抵抗が接続されているとき、Lx〔mH〕を求めよ。`,
      defaultSolution: [
        `着眼点: ブリッジの平衡条件は「対辺インピーダンスの積が等しい」。実部・虚部を分けて解く。`,
        `虚部の条件から Lx=R2·R3·C4`,
        `Lx=${r2}×${r3}×${formatClean(c4)}×10⁻⁶H=${answerText}mH`,
        `ポイント: ホイートストンブリッジの「比」の感覚で R2/R3 とするのが典型ミス。積になる。`,
      ],
      physicallyValid: true,
    };
  },
});
