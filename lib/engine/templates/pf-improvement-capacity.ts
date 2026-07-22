/**
 * テンプレート: 力率改善による変圧器の余裕容量（二種一次・電力・numeric）。
 *   容量 S〔kV·A〕の変圧器に有効電力 P〔kW〕（遅れ力率）の負荷が接続されているとき、
 *   進相コンデンサで総合力率を cosθ2 まで改善すると、変圧器が過負荷にならずに
 *   追加できる有効電力は
 *     ΔP = S·cosθ2 − P 〔kW〕
 *   過去問頻出の「力率改善」を、コンデンサ容量ではなく設備の増設余力にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const S_SET: ReadonlyArray<number> = [100, 200, 300, 500];
const P_SET: ReadonlyArray<number> = [60, 80, 120, 150, 240, 360];
const PF_SET: ReadonlyArray<number> = [0.8, 0.9, 0.95, 1];

type Params = {
  transformer_capacity: number;
  load_power: number;
  power_factor_after: number;
};

export const pfImprovementCapacity = defineTemplate<Params>({
  topic: "力率改善による変圧器の余裕容量",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 4,
  pastExam: { area: "力率改善・無効電力", frequency: "high", years: [2008, 2012, 2018, 2022] },
  paramSpecs: {
    transformer_capacity: { unit: "kV·A", realistic_range: [50, 1000] },
    load_power: { unit: "kW", realistic_range: [30, 800] },
    power_factor_after: { unit: "", realistic_range: [0.7, 1] },
  },
  paramOrder: ["transformer_capacity", "load_power", "power_factor_after"],
  draw(rng) {
    return {
      transformer_capacity: pick(S_SET, rng),
      load_power: pick(P_SET, rng),
      power_factor_after: pick(PF_SET, rng),
    };
  },
  buildFrom({ transformer_capacity: s, load_power: p, power_factor_after: pf }) {
    if (s <= 0 || p <= 0) return null;
    if (pf <= 0 || pf > 1) return null;
    const usablePower = s * pf;
    const margin = usablePower - p;
    if (margin <= 0) return null; // 既に容量不足の draw は不成立
    if (!isCleanAnswer(usablePower) || !isCleanAnswer(margin)) return null;
    const answerText = formatClean(margin);
    const usable = formatClean(usablePower);
    return {
      format: "numeric",
      params: {
        transformer_capacity: { value: s, unit: "kV·A", realistic_range: [50, 1000] },
        load_power: { value: p, unit: "kW", realistic_range: [30, 800] },
        power_factor_after: { value: pf, unit: "", realistic_range: [0.7, 1] },
      },
      answerValue: margin,
      answerUnit: "kW",
      answerText,
      facts: { s, p, pf, usablePower, margin },
      defaultStatement:
        `容量 ${s}kV·A の配電用変圧器に、有効電力 ${p}kW の遅れ力率負荷が接続されている。` +
        `進相コンデンサを設置して変圧器から見た総合力率を ${pf} まで改善するとき、` +
        `変圧器を過負荷にせずに追加できる有効電力 ΔP〔kW〕の最大値を求めよ。` +
        `ただし追加負荷を含めた総合力率も ${pf} を維持するものとする。`,
      defaultSolution: [
        `着眼点: 変圧器の制約は皮相電力 S。総合力率 cosθ2 なら有効電力は最大 S·cosθ2 まで運べる。`,
        `供給可能な有効電力の上限: S·cosθ2=${s}×${formatClean(pf)}=${usable}kW`,
        `ΔP=${usable}−${p}=${answerText}kW`,
        `ポイント: 力率改善は「同じ変圧器でより多くの kW を送る」設備対策でもある。`,
      ],
      physicallyValid: true,
    };
  },
});
