/**
 * テンプレート: 相互インダクタンスと合成（理論・numeric）。
 *   2つのコイルを直列接続したときの合成インダクタンス:
 *     和動接続（磁束が加わる向き）: L = L1 + L2 + 2M
 *     差動接続（磁束が打ち消す向き）: L = L1 + L2 − 2M
 *   結合係数 k=M/√(L1·L2) ≤ 1 すなわち M² ≤ L1·L2。
 *
 * 典型ミス（解説で言及）:
 *   ・2M を 1M とする … 相互作用が両コイルに現れることを失念
 *   ・和動/差動の符号を取り違える
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const L_SET: ReadonlyArray<number> = [10, 20, 30, 40]; // 〔mH〕
const M_SET: ReadonlyArray<number> = [5, 10, 15, 20]; // 〔mH〕

type Params = {
  inductance1: number;
  inductance2: number;
  mutual: number;
  connection: number;
};

export const mutualInductance = defineTemplate<Params>({
  topic: "相互インダクタンスと合成",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: {
    area: "電磁気",
    frequency: "mid",
    years: [2009, 2014, 2019, 2024],
    note: "直列接続の合成 L=L1+L2±2M（和動+/差動−）。結合は M²≤L1·L2",
  },
  paramSpecs: {
    inductance1: { unit: "mH", realistic_range: [10, 40] },
    inductance2: { unit: "mH", realistic_range: [10, 40] },
    mutual: { unit: "mH", realistic_range: [5, 20] },
    connection: { realistic_range: [0, 1] },
  },
  paramOrder: ["inductance1", "inductance2", "mutual", "connection"],
  draw(rng) {
    return {
      inductance1: pick(L_SET, rng),
      inductance2: pick(L_SET, rng),
      mutual: pick(M_SET, rng),
      connection: Math.floor(rng() * 2),
    };
  },
  buildFrom({ inductance1, inductance2, mutual, connection }) {
    if (inductance1 <= 0 || inductance2 <= 0 || mutual <= 0) return null;
    // 結合係数 k≤1（M²≤L1·L2）の物理ガード。
    if (mutual * mutual > inductance1 * inductance2) return null;
    const isAiding = connection === 0;
    const L = isAiding ? inductance1 + inductance2 + 2 * mutual : inductance1 + inductance2 - 2 * mutual;
    if (L <= 0) return null;
    if (!isCleanAnswer(L)) return null;
    const answerText = formatClean(L);
    const connectionLabel = isAiding ? "和動接続（磁束が加わる向き）" : "差動接続（磁束が打ち消す向き）";
    const sign = isAiding ? "+" : "−";
    return {
      format: "numeric",
      params: {
        inductance1: { value: inductance1, unit: "mH", realistic_range: [10, 40] },
        inductance2: { value: inductance2, unit: "mH", realistic_range: [10, 40] },
        mutual: { value: mutual, unit: "mH", realistic_range: [5, 20] },
        connection: { value: connection, realistic_range: [0, 1] },
      },
      answerValue: L,
      answerUnit: "mH",
      answerText,
      facts: { inductance1, inductance2, mutual, connection, L },
      defaultStatement:
        `自己インダクタンス L1=${formatClean(inductance1)}mH と L2=${formatClean(inductance2)}mH の2つのコイルを、` +
        `相互インダクタンス M=${formatClean(mutual)}mH で${connectionLabel}になるよう直列接続した。` +
        `合成インダクタンス〔mH〕は?`,
      defaultSolution: [
        `直列接続の合成インダクタンス L=L1+L2${sign}2M（${connectionLabel}）`,
        `L=${formatClean(inductance1)}+${formatClean(inductance2)}${sign}2×${formatClean(mutual)}`,
        `L=${answerText}mH`,
      ],
      physicallyValid: true,
    };
  },
});
