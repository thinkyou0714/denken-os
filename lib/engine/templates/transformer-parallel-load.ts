/**
 * テンプレート: 変圧器並行運転の負荷分担（機械・numeric）。
 *   定格容量が等しい2台の並行運転では、負荷分担は %インピーダンスに逆比例:
 *     P_A = P × %Z_B / (%Z_A + %Z_B)
 *   （%Zが小さい方が多く分担する。過去問頻出の基本）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const Z_SET: ReadonlyArray<number> = [2, 2.5, 3, 4, 5, 6, 7.5];
const P_SET: ReadonlyArray<number> = [300, 500, 600, 800, 900, 1000, 1200, 1500];

type Params = {
  percent_z_a: number;
  percent_z_b: number;
  total_load: number;
};

export const transformerParallelLoad = defineTemplate<Params>({
  topic: "変圧器並行運転の負荷分担",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "変圧器", frequency: "mid", years: [2009, 2014, 2020, 2025] },
  paramSpecs: {
    percent_z_a: { unit: "%", realistic_range: [1, 10] },
    percent_z_b: { unit: "%", realistic_range: [1, 10] },
    total_load: { unit: "kVA", realistic_range: [100, 3000] },
  },
  paramOrder: ["percent_z_a", "percent_z_b", "total_load"],
  draw(rng) {
    return {
      percent_z_a: pick(Z_SET, rng),
      percent_z_b: pick(Z_SET, rng),
      total_load: pick(P_SET, rng),
    };
  },
  buildFrom({ percent_z_a: za, percent_z_b: zb, total_load: total }) {
    if (za <= 0 || zb <= 0 || total <= 0 || za === zb) return null;
    const pa = (total * zb) / (za + zb);
    if (!isCleanAnswer(pa)) return null;
    const answerText = formatClean(pa);
    return {
      format: "numeric",
      params: {
        percent_z_a: { value: za, unit: "%", realistic_range: [1, 10] },
        percent_z_b: { value: zb, unit: "%", realistic_range: [1, 10] },
        total_load: { value: total, unit: "kVA", realistic_range: [100, 3000] },
      },
      answerValue: pa,
      answerUnit: "kVA",
      answerText,
      facts: { za, zb, total, pa },
      defaultStatement:
        `定格容量が等しい変圧器A（%Z=${formatClean(za)}%）とB（%Z=${formatClean(zb)}%）を並行運転し、` +
        `合計 ${total}kVA の負荷に供給する。変圧器Aが分担する負荷〔kVA〕は?`,
      defaultSolution: [
        `定格容量が等しい並行運転の負荷分担は %Z に逆比例する`,
        `P_A=P×%Z_B/(%Z_A+%Z_B)=${total}×${formatClean(zb)}/(${formatClean(za)}+${formatClean(zb)})`,
        `=${answerText}kVA`,
      ],
      physicallyValid: true,
    };
  },
});
