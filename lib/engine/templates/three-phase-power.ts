/**
 * テンプレート T-0001: 平衡三相 Y 結線・線間電圧 V・1相 Z=R+jX → 三相有効電力 P。
 *
 * 閉形式（コードが算出する唯一の真値）:
 *   相電圧 V_p = V/√3,  相電流 I = V_p/|Z|,  |Z| = √(R²+X²)
 *   P = 3·I²·R = 3·(V²/3)/|Z|²·R = V²·R / (R²+X²)   〔W〕
 *
 * 誤答（すべて「成立する典型ミス」, problem-sample.md）:
 *   ① 力率二重掛け  P·cosφ
 *   ② 無効電力混同  Q = V²·X/(R²+X²)（有効電力 P と無効電力 Q の取り違え）
 *   ③ 力率掛け忘れ  皮相電力 S = P/cosφ
 *   ④ √3 忘れ       線間電圧を相電圧として計算 = 3·P
 *
 * 本番（一次）は五択マークシートのため buildMcChoices で五択に整える。
 */
import { formatKW } from "../clean.js";
import { threePhaseYFigure } from "../figures/index.js";
import { buildMcChoices, defineTemplate, pick } from "./helpers.js";

// 係数いじりの母集合（|Z| が整数になる Pythagorean ペア × round な電圧）。
// 「答えが綺麗になる係数だけ採用」(03-quality-pipeline) をサンプリング段で担保する。
const RX_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [3, 4],
  [4, 3],
  [6, 8],
  [8, 6],
  [5, 12],
  [12, 5],
  [9, 12],
  [12, 9],
  [8, 15],
  [15, 8],
  [12, 16],
  [16, 12],
  [20, 15],
  [15, 20],
  [7, 24],
  [24, 7],
];
const VOLTAGES: ReadonlyArray<number> = [100, 200, 400, 440, 3300, 6600];

type Params = {
  line_voltage: number;
  R: number;
  X: number;
};

export const threePhasePower = defineTemplate<Params>({
  topic: "三相交流電力",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "三相交流回路", frequency: "high", years: [2007, 2011, 2015, 2019, 2023] },
  paramSpecs: {
    line_voltage: { unit: "V", realistic_range: [100, 6600] },
    R: { unit: "Ω", realistic_range: [1, 50] },
    X: { unit: "Ω", realistic_range: [1, 50] },
  },
  paramOrder: ["line_voltage", "R", "X"],
  draw(rng) {
    const V = pick(VOLTAGES, rng);
    const [R, X] = pick(RX_PAIRS, rng);
    return { line_voltage: V, R, X };
  },
  buildFrom({ line_voltage: V, R, X }) {
    if (R <= 0 || X <= 0 || V <= 0) return null;
    const Z = Math.sqrt(R * R + X * X);
    const cosPhi = R / Z;
    if (cosPhi > 1 + 1e-9) return null; // 物理的に不成立

    const P = (V * V * R) / (R * R + X * X); // 正解(W)
    const Q = (V * V * X) / (R * R + X * X); // ② 無効電力（P と Q の取り違え）
    const pfDouble = P * cosPhi; // ① 力率二重掛け
    const apparent = P / cosPhi; // ③ 力率掛け忘れ(皮相)
    const noSqrt3 = 3 * P; // ④ √3 忘れ

    // 本番（一次）の五択に合わせ、全選択肢の kW 表示が綺麗・一意であることを buildMcChoices で担保する。
    const mc = buildMcChoices(
      P,
      [
        { value: pfDouble, reason: "力率を二重に掛けた (3I²R にさらに cosφ)" },
        { value: Q, reason: "有効電力 P の代わりに無効電力 Q=V²X/(R²+X²) を求めた" },
        { value: apparent, reason: "力率を掛け忘れ、皮相電力 S と混同" },
        { value: noSqrt3, reason: "Y結線で √3 を忘れ、線間電圧を相電圧として計算" },
      ],
      formatKW,
      { displayScale: 1000 }, // formatKW は W→kW（÷1000）で整形するため真値(W)との照合に係数を渡す
    );
    if (!mc) return null;

    const Vp = V / Math.sqrt(3);
    const I = Vp / Z;

    return {
      params: {
        line_voltage: { value: V, unit: "V", realistic_range: [100, 6600] },
        R: { value: R, unit: "Ω", realistic_range: [1, 50] },
        X: { value: X, unit: "Ω", realistic_range: [1, 50] },
      },
      // answerValue は answerUnit と同じ単位系で持つ（契約: 検算の基準値）。
      // P は W なので kW に揃える（W のままだと answerUnit="kW" と 1000 倍ずれる）。
      answerValue: P / 1000,
      answerUnit: "kW",
      answerText: mc.answerText,
      choices: mc.choices,
      distractors: mc.distractors,
      likelyWrongChoice: formatKW(noSqrt3),
      facts: {
        V,
        R,
        X,
        Z: Number(Z.toFixed(4)),
        cosPhi: Number(cosPhi.toFixed(4)),
        Vp: Number(Vp.toFixed(4)),
        I: Number(I.toFixed(4)),
        P_watt: P,
      },
      defaultStatement:
        `平衡三相Y結線の負荷に線間電圧${V}Vを加えた。` +
        `1相のインピーダンスがZ=${R}+j${X}Ωのとき三相有効電力P〔kW〕は?`,
      defaultSolution: [
        `|Z|=√(${R}²+${X}²)=${Z}Ω`,
        `力率cosφ=R/|Z|=${Number(cosPhi.toFixed(4))}`,
        `相電圧V_p=${V}/√3、相電流I=V_p/|Z|`,
        `P=3·I²·R=${mc.answerText}kW`,
        `別解 P=√3·V_l·I_l·cosφ でも一致`,
        `ポイント: Y結線は相電圧=線間/√3。√3 の入れ忘れが最頻ミス。`,
      ],
      figure: threePhaseYFigure(V, R, X),
      physicallyValid: true,
    };
  },
});
