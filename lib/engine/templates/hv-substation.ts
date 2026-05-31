/**
 * テンプレート: 高圧受電設備の主要機器の役割（定性・選択式）。
 *
 * 機器（断路器DS／遮断器CB／避雷器LA／計器用変圧器VT）の役割を問う。
 * 誤答は「他機器の役割」（=成立する典型的な取り違え）。
 */
import type { GenerationResult, Template } from "./types.js";

interface Device {
  name: string;
  role: string;
}
const DEVICES: ReadonlyArray<Device> = [
  { name: "断路器（DS）", role: "無負荷の電路を開閉し、点検時に確実な絶縁距離を確保する（負荷電流の開閉はできない）" },
  { name: "遮断器（CB）", role: "負荷電流を開閉し、短絡・地絡などの事故電流を遮断して電路を保護する" },
  { name: "避雷器（LA）", role: "雷や開閉に伴う異常電圧（サージ）を大地に放電し、機器の絶縁を保護する" },
  { name: "計器用変圧器（VT）", role: "高電圧を計器・保護継電器用の低電圧（110V）に変成する" },
];

function buildFrom(idx: number): GenerationResult | null {
  if (!Number.isInteger(idx) || idx < 0 || idx >= DEVICES.length) return null;
  const subject = DEVICES[idx]!;
  const choices = DEVICES.map((d) => d.role);

  return {
    format: "multiple_choice",
    params: { variant: { value: idx, unit: "", realistic_range: [0, DEVICES.length - 1] } },
    answerValue: idx,
    answerUnit: "",
    answerText: subject.role,
    choices,
    distractors: DEVICES.filter((_, i) => i !== idx).map((d) => ({
      text: d.role,
      reason: `これは「${d.name}」の役割であり、設問の機器の役割ではない`,
    })),
    likelyWrongChoice: DEVICES[(idx + 1) % DEVICES.length]!.role,
    facts: { device: subject.name },
    defaultStatement: `高圧受電設備における「${subject.name}」の主な役割として最も適切なものはどれか。`,
    defaultSolution: [
      `${subject.name}の役割: ${subject.role}`,
      `断路器は無負荷開閉、遮断器は事故電流遮断、避雷器はサージ保護、VTは電圧変成と整理する`,
    ],
    physicallyValid: true,
  };
}

export const hvSubstation: Template = {
  topic: "高圧受電設備",
  subject: "法規",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["法規", "高圧受電設備", "保護機器", "キュービクル"],
    formulas: ["（定性）DS=無負荷開閉 / CB=事故遮断 / LA=サージ保護 / VT=電圧変成"],
    learningObjectives: ["高圧受電設備の主要機器の役割を区別できる"],
    hints: ["断路器は負荷電流を切れない", "遮断器が事故電流を切る", "避雷器はサージ、VTは計測用変成"],
    prerequisites: ["電圧の区分"],
    relatedTopics: ["電気事業法（主任技術者）", "中性点接地方式"],
    estimatedTimeSec: 90,
    cognitiveLevel: "understand",
    references: [{ label: "高圧受電設備規程", article: "受電設備の機器構成" }],
  },
  paramSpecs: { variant: { unit: "", realistic_range: [0, DEVICES.length - 1] } },
  generate(rng) {
    return buildFrom(Math.floor(rng() * DEVICES.length));
  },
  generateFrom(params) {
    const { variant } = params;
    if (variant === undefined) return null;
    return buildFrom(variant);
  },
};
