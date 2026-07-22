/**
 * テンプレート: 誘導電動機の効率（損失内訳）（二種一次・機械・numeric）。
 *   一次入力 P1 から固定子損 Ps を引いた二次入力 P2=P1−Ps、
 *   二次銅損 Pc2=s·P2、機械出力 Pm'=P2−Pc2 から機械損 Pm を引いて軸出力
 *     Pout = P2·(1−s) − Pm、効率 η = Pout/P1 × 100 〔%〕
 *   過去問頻出の「二次入力・二次銅損」を、電力の流れ図を最後までたどる形にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const P1_SET: ReadonlyArray<number> = [40, 50, 60, 80, 100];
const PS_SET: ReadonlyArray<number> = [2, 3, 4, 5];
const S_SET: ReadonlyArray<number> = [0.02, 0.025, 0.04, 0.05];
const PM_SET: ReadonlyArray<number> = [1, 1.5, 2, 3];

type Params = {
  input_power: number;
  stator_loss: number;
  slip: number;
  mech_loss: number;
};

export const inductionMotorEfficiency = defineTemplate<Params>({
  topic: "誘導電動機の効率（損失内訳）",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 4,
  pastExam: { area: "誘導機", frequency: "high", years: [2008, 2013, 2018, 2023] },
  paramSpecs: {
    input_power: { unit: "kW", realistic_range: [20, 150] },
    stator_loss: { unit: "kW", realistic_range: [1, 8] },
    slip: { unit: "", realistic_range: [0.01, 0.08] },
    mech_loss: { unit: "kW", realistic_range: [0.5, 5] },
  },
  paramOrder: ["input_power", "stator_loss", "slip", "mech_loss"],
  draw(rng) {
    return {
      input_power: pick(P1_SET, rng),
      stator_loss: pick(PS_SET, rng),
      slip: pick(S_SET, rng),
      mech_loss: pick(PM_SET, rng),
    };
  },
  buildFrom({ input_power: p1, stator_loss: ps, slip: s, mech_loss: pm }) {
    if (p1 <= 0 || ps <= 0 || pm <= 0) return null;
    if (s <= 0 || s >= 1) return null;
    const p2 = p1 - ps;
    if (p2 <= 0) return null;
    const pc2 = s * p2;
    const pOut = p2 * (1 - s) - pm;
    if (pOut <= 0) return null;
    const eta = (pOut / p1) * 100;
    if (eta <= 50 || eta >= 100) return null;
    if (!isCleanAnswer(p2) || !isCleanAnswer(pc2) || !isCleanAnswer(pOut) || !isCleanAnswer(eta)) return null;
    const answerText = formatClean(eta);
    const p2Text = formatClean(p2);
    const pc2Text = formatClean(pc2);
    const outText = formatClean(pOut);
    return {
      format: "numeric",
      params: {
        input_power: { value: p1, unit: "kW", realistic_range: [20, 150] },
        stator_loss: { value: ps, unit: "kW", realistic_range: [1, 8] },
        slip: { value: s, unit: "", realistic_range: [0.01, 0.08] },
        mech_loss: { value: pm, unit: "kW", realistic_range: [0.5, 5] },
      },
      answerValue: eta,
      answerUnit: "%",
      answerText,
      facts: { p1, ps, s, pm, p2, pc2, pOut, eta },
      defaultStatement:
        `三相誘導電動機が一次入力 ${p1}kW で運転している。固定子の損失（一次銅損＋鉄損）の合計は ` +
        `${ps}kW、滑りは ${s}、機械損は ${pm}kW である。この電動機の効率〔%〕を求めよ。`,
      defaultSolution: [
        `着眼点: 電力の流れ図 P1 →(固定子損)→ P2 →(二次銅損 s·P2)→ 機械出力 →(機械損)→ 軸出力。`,
        `二次入力: P2=${p1}−${ps}=${p2Text}kW`,
        `二次銅損: Pc2=s·P2=${formatClean(s, 3)}×${p2Text}=${pc2Text}kW`,
        `軸出力: Pout=P2×(1−s)−Pm=${p2Text}×${formatClean(1 - s, 3)}−${formatClean(pm)}=${outText}kW`,
        `η=Pout/P1×100=${outText}/${p1}×100=${answerText}%`,
        `ポイント: 二次銅損は「二次入力×滑り」。一次入力に滑りを掛ける誤りが典型。`,
      ],
      physicallyValid: true,
    };
  },
});
