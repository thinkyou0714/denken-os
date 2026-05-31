/**
 * テンプレート: 変電所の保護リレーの役割（電験二種二次「電力・管理」, 定性・選択式）。
 *
 * 4 種（過電流／地絡方向／比率差動／距離）の役割を問う。誤答は他リレーの役割。
 */
import type { GenerationResult, Template } from "./types.js";

interface Relay {
  name: string;
  role: string;
}
const RELAYS: ReadonlyArray<Relay> = [
  { name: "過電流継電器（OCR）", role: "電流が整定値を超えたときに動作し、過負荷や短絡を検出する" },
  { name: "地絡方向継電器（DGR）", role: "零相電圧と零相電流の位相関係から、自系統側の地絡のみを判別して動作する" },
  {
    name: "比率差動継電器（RDF）",
    role: "機器の両端電流の差が流入電流に対する一定比率を超えたとき、内部故障として動作する",
  },
  { name: "距離継電器（距離リレー）", role: "電圧と電流の比（インピーダンス）から故障点までの距離を判定して動作する" },
];

function buildFrom(idx: number): GenerationResult | null {
  if (!Number.isInteger(idx) || idx < 0 || idx >= RELAYS.length) return null;
  const subject = RELAYS[idx]!;
  const choices = RELAYS.map((r) => r.role);

  return {
    format: "multiple_choice",
    params: { variant: { value: idx, unit: "", realistic_range: [0, RELAYS.length - 1] } },
    answerValue: idx,
    answerUnit: "",
    answerText: subject.role,
    choices,
    distractors: RELAYS.filter((_, i) => i !== idx).map((r) => ({
      text: r.role,
      reason: `これは「${r.name}」の役割であり、設問のリレーの役割ではない`,
    })),
    likelyWrongChoice: RELAYS[(idx + 1) % RELAYS.length]!.role,
    facts: { relay: subject.name },
    defaultStatement: `保護継電方式における「${subject.name}」の動作原理・役割として最も適切なものはどれか。`,
    defaultSolution: [
      `${subject.name}: ${subject.role}`,
      `過電流=大きさ、地絡方向=零相の位相、比率差動=両端差、距離=Z で判別、と整理する`,
    ],
    physicallyValid: true,
  };
}

export const protectiveRelay: Template = {
  topic: "変電所の保護リレー",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  meta: {
    tags: ["電力管理", "二次試験", "保護継電器", "リレー"],
    formulas: ["（定性）OCR=過電流 / DGR=地絡方向 / RDF=比率差動 / 距離=Z 判定"],
    learningObjectives: ["主要な保護リレーの動作原理と適用箇所を区別できる"],
    hints: ["差動は変圧器・母線の内部故障", "地絡方向は位相で自系統を判別", "距離はインピーダンスで測距"],
    prerequisites: ["対称座標法による故障計算"],
    relatedTopics: ["中性点接地と地絡", "高圧受電設備"],
    estimatedTimeSec: 240,
    cognitiveLevel: "understand",
    references: [{ label: "保護継電方式", article: "電力・管理（二次）頻出テーマ" }],
  },
  paramSpecs: { variant: { unit: "", realistic_range: [0, RELAYS.length - 1] } },
  generate(rng) {
    return buildFrom(Math.floor(rng() * RELAYS.length));
  },
  generateFrom(params) {
    const { variant } = params;
    if (variant === undefined) return null;
    return buildFrom(variant);
  },
};
