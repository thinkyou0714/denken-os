/**
 * テンプレート: ループ配電線の電流分布（二種二次・電力管理・descriptive）。
 *   両端 A・B を同一電圧の電源に接続した単位長当たり抵抗一様のループ（こう長 L）で、
 *   A から a〔km〕の点に I1、a+b〔km〕の点に I2 の負荷があるとき、
 *   電圧降下の釣り合い（モーメント法）から A 端の供給電流は
 *     IA = { I1·(L−a) + I2·(L−a−b) } / L 〔A〕
 *   過去問頻出の「ループ式線路の電流分布」を、負荷位置・負荷値を振ってひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const L_SET: ReadonlyArray<number> = [8, 10, 12];
const A_SET: ReadonlyArray<number> = [2, 3, 4];
const B_SET: ReadonlyArray<number> = [2, 3, 4];
const I1_SET: ReadonlyArray<number> = [40, 60, 100];
const I2_SET: ReadonlyArray<number> = [40, 60, 80];

type Params = {
  total_length: number;
  dist_a: number;
  dist_b: number;
  load1: number;
  load2: number;
};

export const loopDistributionCurrent = defineTemplate<Params>({
  topic: "ループ配電線の電流分布",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "配電・需要損失", frequency: "mid", years: [2008, 2013, 2019, 2024] },
  paramSpecs: {
    total_length: { unit: "km", realistic_range: [5, 20] },
    dist_a: { unit: "km", realistic_range: [1, 6] },
    dist_b: { unit: "km", realistic_range: [1, 6] },
    load1: { unit: "A", realistic_range: [20, 150] },
    load2: { unit: "A", realistic_range: [20, 150] },
  },
  paramOrder: ["total_length", "dist_a", "dist_b", "load1", "load2"],
  draw(rng) {
    return {
      total_length: pick(L_SET, rng),
      dist_a: pick(A_SET, rng),
      dist_b: pick(B_SET, rng),
      load1: pick(I1_SET, rng),
      load2: pick(I2_SET, rng),
    };
  },
  buildFrom({ total_length: L, dist_a: a, dist_b: b, load1: I1, load2: I2 }) {
    if (L <= 0 || a <= 0 || b <= 0 || I1 <= 0 || I2 <= 0) return null;
    const c = a + b;
    if (c >= L) return null; // 2つ目の負荷点はループ上（B端の手前）にあること
    const iA = (I1 * (L - a) + I2 * (L - c)) / L;
    const iB = I1 + I2 - iA;
    // 両端とも順方向に供給する解のみ採用（負電流＝想定外の潮流は棄却）。
    if (iA <= 0 || iB <= 0) return null;
    if (!isCleanAnswer(iA)) return null;
    const answerText = formatClean(iA);
    const ibText = formatClean(iB);
    return {
      format: "descriptive",
      params: {
        total_length: { value: L, unit: "km", realistic_range: [5, 20] },
        dist_a: { value: a, unit: "km", realistic_range: [1, 6] },
        dist_b: { value: b, unit: "km", realistic_range: [1, 6] },
        load1: { value: I1, unit: "A", realistic_range: [20, 150] },
        load2: { value: I2, unit: "A", realistic_range: [20, 150] },
      },
      answerValue: iA,
      answerUnit: "A",
      answerText,
      facts: { L, a, b, I1, I2, iA, iB },
      defaultStatement:
        `こう長 ${L}km、単位長当たりの抵抗が一様なループ状配電線路の両端 A・B を同一電圧の電源に接続する。` +
        `A から ${a}km の地点に ${I1}A、そこからさらに ${b}km の地点に ${I2}A の負荷（いずれも力率1）がある。` +
        `A 端から供給される電流 IA〔A〕を求めよ。`,
      defaultSolution: [
        `着眼点: 両端同電圧なら「A端からの電圧降下の総和 = B端からの電圧降下の総和」（モーメント法）。`,
        `各負荷の B 端側距離を重みに: IA=[I1·(L−a)+I2·(L−a−b)]/L`,
        `IA=[${I1}×(${L}−${a})+${I2}×(${L}−${a + b})]/${L}=${answerText}A`,
        `（B端の供給電流は IB=I1+I2−IA=${ibText}A）`,
        `ポイント: 距離の重み付き平均で分担が決まり、負荷に近い端ほど多く供給する。`,
      ],
      physicallyValid: true,
    };
  },
});
