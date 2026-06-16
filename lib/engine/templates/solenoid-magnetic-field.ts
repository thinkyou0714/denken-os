/**
 * テンプレート: ソレノイド内の磁界（理論・numeric）。
 *   無限長ソレノイドの内部磁界（軸方向で一様）:
 *     H = n·I = (N/l)·I    （n: 単位長あたり巻数, N: 総巻数, l: 長さ, I: 電流）〔A/m〕
 *
 * 典型ミス（解説で言及）:
 *   ・H=N·I … 単位長あたり巻数 n=N/l に直さず総巻数のまま掛ける
 *   ・H=B/μ0 との混同 … 磁束密度 B と磁界 H を取り違える
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const TURNS_SET: ReadonlyArray<number> = [200, 400, 500, 1000, 2000];
const CURRENT_SET: ReadonlyArray<number> = [1, 2, 4, 5]; // 〔A〕
const LENGTH_SET: ReadonlyArray<number> = [0.2, 0.25, 0.4, 0.5, 1]; // 〔m〕

type Params = {
  turns: number;
  current: number;
  length: number;
};

export const solenoidMagneticField = defineTemplate<Params>({
  topic: "ソレノイド内の磁界",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: {
    area: "電磁気",
    frequency: "mid",
    years: [2010, 2015, 2020, 2025],
    note: "無限長ソレノイドの内部磁界。単位長あたり巻数 n=N/l",
  },
  paramSpecs: {
    turns: { realistic_range: [100, 2000] },
    current: { unit: "A", realistic_range: [1, 5] },
    length: { unit: "m", realistic_range: [0.2, 1] },
  },
  paramOrder: ["turns", "current", "length"],
  draw(rng) {
    return {
      turns: pick(TURNS_SET, rng),
      current: pick(CURRENT_SET, rng),
      length: pick(LENGTH_SET, rng),
    };
  },
  buildFrom({ turns, current, length }) {
    if (turns <= 0 || current <= 0 || length <= 0) return null;
    const h = (turns * current) / length; // 内部磁界 H〔A/m〕
    if (!isCleanAnswer(h)) return null;
    const answerText = formatClean(h);
    return {
      format: "numeric",
      params: {
        turns: { value: turns, realistic_range: [100, 2000] },
        current: { value: current, unit: "A", realistic_range: [1, 5] },
        length: { value: length, unit: "m", realistic_range: [0.2, 1] },
      },
      answerValue: h,
      answerUnit: "A/m",
      answerText,
      facts: { turns, current, length, h },
      defaultStatement:
        `総巻数 N=${formatClean(turns)} 回、長さ l=${formatClean(length)}m の十分に長いソレノイドに ` +
        `電流 I=${formatClean(current)}A を流したとき、内部の磁界の大きさ H〔A/m〕は?`,
      defaultSolution: [
        `無限長ソレノイド内の磁界 H=nI=(N/l)I`,
        `H=${formatClean(turns)}×${formatClean(current)}/${formatClean(length)}`,
        `H=${answerText}A/m`,
      ],
      physicallyValid: true,
    };
  },
});
