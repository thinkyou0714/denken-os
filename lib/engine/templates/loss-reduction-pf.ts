/**
 * テンプレート: 力率改善による線路損失の低減（二種二次・電力管理・descriptive）。
 *   有効電力一定のまま力率を cosθ1→cosθ2 に改善すると、線路電流は cosθ に反比例し
 *   抵抗損は電流の2乗に比例するため
 *     L2 = L1 × (cosθ1/cosθ2)² 〔kW〕
 *   過去問頻出の「力率改善」を、コンデンサ容量ではなく損失低減効果にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const L1_SET: ReadonlyArray<number> = [16, 32, 48, 64, 80, 100, 120, 160, 200];
/** [改善前cosθ1, 改善後cosθ2]。比の2乗が綺麗になる組。 */
const PF_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0.6, 0.8],
  [0.8, 1],
  [0.6, 1],
  [0.7, 1],
  [0.9, 1],
  [0.5, 1],
  [0.6, 0.75],
  [0.75, 1],
];

type Params = {
  loss_before: number;
  power_factor_before: number;
  power_factor_after: number;
};

export const lossReductionPf = defineTemplate<Params>({
  topic: "力率改善による線路損失低減",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "配電・需要損失", frequency: "high", years: [2006, 2011, 2016, 2022] },
  paramSpecs: {
    loss_before: { unit: "kW", realistic_range: [10, 300] },
    power_factor_before: { unit: "", realistic_range: [0.4, 1] },
    power_factor_after: { unit: "", realistic_range: [0.6, 1] },
  },
  paramOrder: ["loss_before", "power_factor_before", "power_factor_after"],
  draw(rng) {
    const [c1, c2] = pick(PF_PAIRS, rng);
    return {
      loss_before: pick(L1_SET, rng),
      power_factor_before: c1,
      power_factor_after: c2,
    };
  },
  buildFrom({ loss_before: l1, power_factor_before: c1, power_factor_after: c2 }) {
    if (l1 <= 0) return null;
    if (c1 <= 0 || c1 > 1 || c2 <= 0 || c2 > 1) return null;
    if (c2 <= c1) return null; // 力率は改善される（cosθ2>cosθ1）
    const ratio = (c1 / c2) ** 2;
    const l2 = l1 * ratio;
    if (l2 <= 0 || !isCleanAnswer(ratio, 4) || !isCleanAnswer(l2)) return null;
    const answerText = formatClean(l2);
    const ratioText = formatClean(ratio, 4);
    return {
      format: "descriptive",
      params: {
        loss_before: { value: l1, unit: "kW", realistic_range: [10, 300] },
        power_factor_before: { value: c1, unit: "", realistic_range: [0.4, 1] },
        power_factor_after: { value: c2, unit: "", realistic_range: [0.6, 1] },
      },
      answerValue: l2,
      answerUnit: "kW",
      answerText,
      facts: { l1, c1, c2, ratio, l2 },
      defaultStatement:
        `ある配電線路の抵抗損は、負荷力率 ${c1}（遅れ）のとき ${l1}kW である。負荷の有効電力と` +
        `受電端電圧を一定に保ったまま、進相コンデンサで力率を ${c2} に改善したときの線路の抵抗損〔kW〕を求めよ。`,
      defaultSolution: [
        `着眼点: P・Vが一定なら線路電流 I∝1/cosθ。抵抗損は I² に比例する。`,
        `損失比: (cosθ1/cosθ2)²=(${c1}/${c2})²=${ratioText}`,
        `L2=L1×(cosθ1/cosθ2)²=${l1}×${ratioText}=${answerText}kW`,
        `ポイント: 力率改善の損失低減は「2乗」で効く。電流比のまま1乗で計算するのが典型ミス。`,
      ],
      physicallyValid: true,
    };
  },
});
