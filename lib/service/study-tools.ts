import type { Attempt } from "./assessment.js";

export const SKILLS = ["公式の想起", "式の選択", "導出", "計算", "単位", "論説", "図の読解"] as const;
export const DRILLS = [
  {
    id: "unit-w",
    skill: "単位",
    prompt: "2.4 kW を W で表す",
    answer: "2400",
    unit: "W",
    reason: "k は1000倍。2.4 × 1000 = 2400。",
    prerequisite: "SI接頭語",
    source: "DENKEN-OS 独自ドリル",
  },
  {
    id: "unit-energy",
    skill: "単位",
    prompt: "500 W を2時間使った電力量を kWh で表す",
    answer: "1",
    unit: "kWh",
    reason: "0.5 kW × 2 h = 1 kWh。電力と電力量を区別する。",
    prerequisite: "電力と時間",
    source: "DENKEN-OS 独自ドリル",
  },
  {
    id: "coeff-star",
    skill: "式の選択",
    prompt: "平衡三相Y結線。線間電圧から相電圧を求める係数は？",
    answer: "1/sqrt(3)",
    unit: "",
    reason: "相電圧は線間電圧を√3で割る。線電流と相電流は等しい。",
    prerequisite: "Y結線とフェーザ",
    source: "DENKEN-OS 独自ドリル",
  },
  {
    id: "coeff-rms",
    skill: "公式の想起",
    prompt: "正弦波の最大値が100 V。実効値を求める式は？",
    answer: "100/sqrt(2)",
    unit: "V",
    reason: "正弦波の実効値は最大値/√2。一般波形へ同じ係数を無条件に使わない。",
    prerequisite: "実効値の定義",
    source: "DENKEN-OS 独自ドリル",
  },
  {
    id: "pz",
    skill: "計算",
    prompt: "10 MVA基準で5%のインピーダンス。同じ基準電圧で20 MVA基準に換算すると何%？",
    answer: "10",
    unit: "%",
    reason: "同じ基準電圧では、新%Z=旧%Z×新容量/旧容量。5×20/10=10。",
    prerequisite: "基準容量と実インピーダンス",
    source: "DENKEN-OS 独自ドリル",
  },
  {
    id: "power-reason",
    skill: "論説",
    prompt: "同じ有効電力・同じ電圧で力率を改善すると、線路の抵抗損失が減る理由を説明する。",
    answer: "",
    unit: "",
    reason: "電流が減るため、同じ線路抵抗でのI²R損失が減る。負荷・電圧・線路抵抗が同じという前提を示す。",
    prerequisite: "有効電力・力率・抵抗損失",
    source: "DENKEN-OS 独自ドリル",
  },
];
export function skillSummary(attempts: Attempt[]) {
  const map = new Map<
    string,
    { skill: string; topic: string; count: number; correct: number; minutes: number; last: number }
  >();
  for (const a of attempts) {
    if (a.mode === "validation" || a.hints || a.revealed || a.correct === null) continue;
    const key = `${a.topic}:${a.skill}`,
      v = map.get(key) ?? { skill: a.skill, topic: a.topic, count: 0, correct: 0, minutes: 0, last: 0 };
    v.count++;
    v.correct += Number(a.correct);
    v.minutes += (a.finishedAt - a.startedAt) / 60000;
    v.last = Math.max(v.last, a.finishedAt);
    map.set(key, v);
  }
  return [...map.values()].sort((a, b) => a.correct / a.count - b.correct / b.count);
}
export function retentionChecks(attempts: Attempt[]) {
  const families = new Map<string, Attempt[]>();
  for (const attempt of attempts)
    if (attempt.mode !== "validation" && !attempt.hints && !attempt.revealed && attempt.correct !== null) {
      const list = families.get(attempt.family) ?? [];
      list.push(attempt);
      families.set(attempt.family, list);
    }
  return [...families.entries()].flatMap(([family, list]) => {
    list.sort((a, b) => a.finishedAt - b.finishedAt);
    const first = list[0];
    if (!first) return [];
    const later = list.find((a) => a.finishedAt - first.finishedAt >= 7 * 86400000);
    return later
      ? [{ family, days: Math.floor((later.finishedAt - first.finishedAt) / 86400000), correct: later.correct }]
      : [];
  });
}
export function demandSignals(rows: { reason: string; willingness: string }[]) {
  const groups = new Map<string, number>();
  for (const row of rows) groups.set(row.reason, (groups.get(row.reason) ?? 0) + 1);
  return {
    responses: rows.length,
    reasons: [...groups].sort((a, b) => b[1] - a[1]),
    note: "聞き取り結果は売上予測や効果の証明ではありません",
  };
}
export function unitEconomics(values: {
  active: number;
  inputTokens: number;
  outputTokens: number;
  inputPrice: number;
  outputPrice: number;
  reviewMinutes: number;
  hourlyCost: number;
  storageCost: number;
  supportMinutes: number;
}) {
  const numbers = Object.values(values);
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) throw new Error("0以上の有限の数値を入力してください");
  const api = (values.inputTokens * values.inputPrice + values.outputTokens * values.outputPrice) / 1e6;
  const supervision = (values.reviewMinutes / 60) * values.hourlyCost,
    support = (values.supportMinutes / 60) * values.hourlyCost;
  const total = api + supervision + support + values.storageCost;
  return {
    api,
    supervision,
    support,
    storage: values.storageCost,
    total,
    perActive: values.active ? total / values.active : null,
  };
}
export function capacityPlan(minutes: number, minutesPerReview: number, waiting: number) {
  if (!Number.isFinite(minutes) || !Number.isFinite(minutesPerReview) || minutes < 0 || minutesPerReview <= 0)
    throw new Error("監修時間と1件の所要時間を入力してください");
  const capacity = Math.floor(minutes / minutesPerReview);
  return {
    capacity,
    waiting,
    remaining: Math.max(0, waiting - capacity),
    weeks: capacity ? Math.ceil(waiting / capacity) : null,
  };
}
export function entitlementActive(
  value: { status: string; expiresAt: number; verified: boolean } | null,
  now = Date.now(),
) {
  return !!value && value.verified && value.status === "active" && value.expiresAt > now;
}
export function portableContext(input: {
  problemId: string;
  revision: string;
  statement: string;
  answer: string;
  hints: number;
  source: string;
}) {
  return `# 電験学習の引き継ぎ\n\n問題: ${input.problemId}\n版: ${input.revision}\n出典: ${input.source}\n\n${input.statement}\n\n## 自分の答案\n${input.answer}\n\nヒント使用: ${input.hints}\n\n条件不足は質問し、計算は検算してください。まず考え方のヒントを一つ示してください。`;
}
export const PREREQUISITES: Record<string, string[]> = {
  単位: ["SI接頭語", "電力と電力量", "秒と時間"],
  係数: ["結線条件", "線間値と相値", "実効値と最大値"],
  式の選択: ["既知量と未知量", "成立する前提", "次元の一致"],
  計算: ["四則と√", "桁の概算", "逆算"],
  前提条件: ["定常・過渡", "平衡・不平衡", "定格と実運転"],
  知識: ["用語の定義", "関連する公式", "簡単な例"],
};
