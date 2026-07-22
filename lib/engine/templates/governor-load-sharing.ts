/**
 * テンプレート: ガバナ特性と負荷分担（二種二次・電力管理・descriptive）。
 *   速度調定率 R〔%〕・定格容量 P〔MW〕の発電機は、系統周波数の低下に対して
 *     K = P/R（%あたりの出力増分）
 *   に比例して出力を増やす。2機並列系統に負荷 ΔP〔MW〕が増加したとき、
 *     ΔPA = ΔP × KA/(KA+KB) 〔MW〕
 *   過去問頻出の「速度調定率と並列運転の負荷分担」を、2機の容量・調定率を
 *   ひねって組み合わせた改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const PA_SET: ReadonlyArray<number> = [100, 200, 300, 400];
const PB_SET: ReadonlyArray<number> = [100, 200, 400];
const R_SET: ReadonlyArray<number> = [2, 2.5, 4, 5];
const DP_SET: ReadonlyArray<number> = [30, 45, 60, 90, 120];

type Params = {
  capacity_a: number;
  capacity_b: number;
  regulation_a: number;
  regulation_b: number;
  load_increase: number;
};

export const governorLoadSharing = defineTemplate<Params>({
  topic: "ガバナ特性と負荷分担",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 5,
  pastExam: { area: "送電・系統安定度", frequency: "mid", years: [2010, 2015, 2021] },
  paramSpecs: {
    capacity_a: { unit: "MW", realistic_range: [50, 500] },
    capacity_b: { unit: "MW", realistic_range: [50, 500] },
    regulation_a: { unit: "%", realistic_range: [1, 6] },
    regulation_b: { unit: "%", realistic_range: [1, 6] },
    load_increase: { unit: "MW", realistic_range: [10, 200] },
  },
  paramOrder: ["capacity_a", "capacity_b", "regulation_a", "regulation_b", "load_increase"],
  draw(rng) {
    return {
      capacity_a: pick(PA_SET, rng),
      capacity_b: pick(PB_SET, rng),
      regulation_a: pick(R_SET, rng),
      regulation_b: pick(R_SET, rng),
      load_increase: pick(DP_SET, rng),
    };
  },
  buildFrom({ capacity_a: pA, capacity_b: pB, regulation_a: rA, regulation_b: rB, load_increase: dP }) {
    if (pA <= 0 || pB <= 0 || rA <= 0 || rB <= 0 || dP <= 0) return null;
    const kA = pA / rA;
    const kB = pB / rB;
    const dPA = (dP * kA) / (kA + kB);
    const dPB = dP - dPA;
    if (dPA <= 0 || dPB <= 0) return null;
    // 分担増分が定格を超える draw は物理的に不成立として棄却。
    if (dPA > pA || dPB > pB) return null;
    if (!isCleanAnswer(dPA) || !isCleanAnswer(kA) || !isCleanAnswer(kB)) return null;
    const answerText = formatClean(dPA);
    const kaText = formatClean(kA);
    const kbText = formatClean(kB);
    return {
      format: "descriptive",
      params: {
        capacity_a: { value: pA, unit: "MW", realistic_range: [50, 500] },
        capacity_b: { value: pB, unit: "MW", realistic_range: [50, 500] },
        regulation_a: { value: rA, unit: "%", realistic_range: [1, 6] },
        regulation_b: { value: rB, unit: "%", realistic_range: [1, 6] },
        load_increase: { value: dP, unit: "MW", realistic_range: [10, 200] },
      },
      answerValue: dPA,
      answerUnit: "MW",
      answerText,
      facts: { pA, pB, rA, rB, dP, kA, kB, dPA, dPB },
      defaultStatement:
        `定格容量 ${pA}MW・速度調定率 ${rA}% の発電機 A と、定格容量 ${pB}MW・速度調定率 ${rB}% の` +
        `発電機 B が並列運転している。系統負荷が ${dP}MW 増加して周波数が新たな一定値に落ち着いたとき、` +
        `発電機 A が受け持つ出力増分 ΔPA〔MW〕を求めよ。ただし両機ともガバナフリー運転とする。`,
      defaultSolution: [
        `着眼点: 周波数低下は系統共通なので、各機の出力増分は K=P/R（定格容量/調定率）に比例する。`,
        `KA=${pA}/${rA}=${kaText}、KB=${pB}/${rB}=${kbText}`,
        `ΔPA=ΔP×KA/(KA+KB)=${dP}×${kaText}/(${kaText}+${kbText})`,
        `ΔPA=${answerText}MW`,
        `（発電機 B の分担は ΔPB=ΔP−ΔPA）`,
        `ポイント: 調定率が小さい（垂下特性が急でない）機ほど多く分担する。容量だけでは決まらない。`,
      ],
      physicallyValid: true,
    };
  },
});
