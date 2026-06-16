/**
 * テンプレート: 三相同期発電機の出力（二種二次・機械制御・descriptive）。
 *   3相出力  P = 3·V·E·sinδ / Xs   〔W〕
 *     V=端子相電圧, E=1相の誘導起電力, Xs=同期リアクタンス〔Ω〕, δ=負荷角
 *   自動採点せず、導出過程を自己採点する（format=descriptive）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { syncPhasorFigure } from "../figures/index.js";
import { defineTemplate, pick } from "./helpers.js";

const V_SET: ReadonlyArray<number> = [200, 220, 440];
const E_SET: ReadonlyArray<number> = [200, 300, 400, 600];
const XS_SET: ReadonlyArray<number> = [5, 10, 20];
// [δ(deg), sinδ]
const DELTA_SET: ReadonlyArray<readonly [number, number]> = [
  [30, 0.5],
  [90, 1.0],
];

type Params = {
  phase_voltage: number;
  induced_emf: number;
  synchronous_reactance: number;
  load_angle: number;
};

export const synchronousGeneratorOutput = defineTemplate<Params>({
  topic: "同期発電機の出力",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "回転機の制御", frequency: "high", years: [2007, 2012, 2017, 2022] },
  paramSpecs: {
    phase_voltage: { unit: "V", realistic_range: [100, 500] },
    induced_emf: { unit: "V", realistic_range: [100, 600] },
    synchronous_reactance: { unit: "ohm", realistic_range: [1, 30] },
    load_angle: { unit: "deg", realistic_range: [0, 90] },
  },
  paramOrder: ["phase_voltage", "induced_emf", "synchronous_reactance", "load_angle"],
  draw(rng) {
    const [deg] = pick(DELTA_SET, rng);
    return {
      phase_voltage: pick(V_SET, rng),
      induced_emf: pick(E_SET, rng),
      synchronous_reactance: pick(XS_SET, rng),
      load_angle: deg,
    };
  },
  buildFrom({ phase_voltage: V, induced_emf: E, synchronous_reactance: Xs, load_angle: deg }) {
    if (V <= 0 || E <= 0 || Xs <= 0) return null;
    const sin = Number(Math.sin((deg * Math.PI) / 180).toFixed(4));
    if (sin <= 0) return null;
    const pW = (3 * V * E * sin) / Xs;
    const pKW = pW / 1000;
    if (!isCleanAnswer(pKW)) return null;
    const answerText = formatClean(pKW);
    return {
      format: "descriptive",
      params: {
        phase_voltage: { value: V, unit: "V", realistic_range: [100, 500] },
        induced_emf: { value: E, unit: "V", realistic_range: [100, 600] },
        synchronous_reactance: { value: Xs, unit: "ohm", realistic_range: [1, 30] },
        load_angle: { value: deg, unit: "deg", realistic_range: [0, 90] },
      },
      answerValue: pKW,
      answerUnit: "kW",
      answerText,
      facts: { V, E, Xs, deg, sin, pKW },
      defaultStatement:
        `三相同期発電機の端子相電圧 V=${V}V、1相の誘導起電力 E=${E}V、同期リアクタンス Xs=${Xs}Ω、` +
        `負荷角 δ=${deg}° である。3相出力 P〔kW〕を P=3VEsinδ/Xs により導出過程とともに求めよ。`,
      defaultSolution: [
        `着眼点: 端子電圧Vと誘導起電力Eの位相差δ（負荷角）が出力を決める。`,
        `1相あたり P1=V·E·sinδ/Xs`,
        `3相出力 P=3·V·E·sinδ/Xs=3×${V}×${E}×${sin}/${Xs}`,
        `P=${formatClean(pW)}W=${answerText}kW`,
        `ポイント: 図のベクトルでjIXsがVとEを結ぶ。δ=90°で最大、安定限界の指標。`,
      ],
      figure: syncPhasorFigure(V, E, deg),
      physicallyValid: true,
    };
  },
});
