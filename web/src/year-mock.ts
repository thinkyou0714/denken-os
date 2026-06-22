/**
 * year-mock.ts — 年度別通し模試（past-exam-year-style full mock）の純ロジック。
 *
 * 目的: 本番1年度ぶんを再現した「単一科目の通し模試」を組む。実際の年度問題は
 *   出題分野（canonical area）ごとに頻度の偏りがあるため、頻出分野ほど多く出るように
 *   重み付けしてサンプリングし、本番の出題構成の体感に近づける。
 *
 * 重み付けの方針（exam.ts buildMockExam の topic 均等とは別物）:
 *   - 問題に area タグがあれば、その area の頻度重み(high/mid/low)でサンプル数を配分する。
 *   - area タグが無い（本リポジトリの現状）の場合は **topic spread** にフォールバックし、
 *     論点の重複を避けて広く取る（= 頻度情報が無いときの安全側）。
 *   - いずれも単一科目に限定し、同一 topic の重複出題は避ける（本番の通し感）。
 *
 * 時間は exam.ts の SUBJECT_EXAM_MINUTES を流用せず、呼び出し側（views/exam.ts）が
 * examTimeLimitMs(set) を使う（このモジュールは「出題の組み立て」だけを担う＝純粋）。
 *
 * DOM 非依存。rng を注入できる（seededRng 等）ため決定論的にテストできる。
 */
import type { Problem, Subject } from "../../lib/engine/schema.js";

/** area 頻度区分 → サンプリングの相対重み。high ほど多く出す。 */
export const AREA_FREQUENCY_WEIGHT: Readonly<Record<"high" | "mid" | "low", number>> = {
  high: 3,
  mid: 2,
  low: 1,
};

/** 年度別通し模試の組み立てオプション。 */
export interface YearMockOptions {
  /** 対象科目（単一科目）。 */
  subject: Subject;
  /** 目標問題数（本番1年度ぶんの目安）。 */
  count: number;
  rng?: () => number;
  /**
   * 任意: 問題ID → 出題分野(area) の対応と、area → 頻度区分のマップ。
   * 両方そろっているときだけ頻度重み付けを行う。無ければ topic spread にフォールバック。
   */
  areaOfProblem?: (p: Problem) => string | undefined;
  areaFrequency?: Readonly<Record<string, "high" | "mid" | "low">>;
}

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

/**
 * topic spread サンプリング（頻度情報が無いとき）。
 * 論点の重複を避けて広く取り、足りなければ重複を許して補充する。
 */
function sampleByTopicSpread(pool: readonly Problem[], take: number, rng: () => number): Problem[] {
  const shuffled = shuffle(pool, rng);
  const seen = new Set<string>();
  const primary: Problem[] = [];
  const leftover: Problem[] = [];
  for (const p of shuffled) {
    if (!seen.has(p.topic)) {
      seen.add(p.topic);
      primary.push(p);
    } else {
      leftover.push(p);
    }
  }
  return [...primary, ...leftover].slice(0, take);
}

/**
 * area 頻度重み付けサンプリング。
 * area ごとに「頻度重みに比例した目標数」を割り当て、各 area 内では topic 重複を避けて取る。
 * 端数や問題不足は最後に topic spread で埋める。
 */
function sampleByAreaFrequency(
  pool: readonly Problem[],
  take: number,
  rng: () => number,
  areaOf: (p: Problem) => string | undefined,
  freq: Readonly<Record<string, "high" | "mid" | "low">>,
): Problem[] {
  // area ごとに問題をまとめる（area 不明は "_" に寄せる）。
  const byArea = new Map<string, Problem[]>();
  for (const p of pool) {
    const area = areaOf(p) ?? "_";
    const g = byArea.get(area) ?? [];
    g.push(p);
    byArea.set(area, g);
  }
  // 各 area の重み（不明 area は low 相当）。
  const areas = [...byArea.keys()];
  const weightOf = (area: string): number => AREA_FREQUENCY_WEIGHT[freq[area] ?? "low"];
  const totalWeight = areas.reduce((s, a) => s + weightOf(a), 0) || 1;

  const out: Problem[] = [];
  const usedIds = new Set<string>();
  const usedTopics = new Set<string>();
  // 重み比で各 area の取り数を決め、topic 重複を避けて取る。
  for (const area of areas) {
    const want = Math.round((weightOf(area) / totalWeight) * take);
    if (want <= 0) continue;
    const picks = sampleByTopicSpread(byArea.get(area) ?? [], want, rng);
    for (const p of picks) {
      if (usedIds.has(p.id) || usedTopics.has(p.topic)) continue;
      out.push(p);
      usedIds.add(p.id);
      usedTopics.add(p.topic);
      if (out.length >= take) return out;
    }
  }
  // 端数・不足分を全体の topic spread で補う（重複 ID/topic は避ける）。
  if (out.length < take) {
    const rest = pool.filter((p) => !usedIds.has(p.id) && !usedTopics.has(p.topic));
    for (const p of sampleByTopicSpread(rest, take - out.length, rng)) {
      if (usedIds.has(p.id)) continue;
      out.push(p);
      usedIds.add(p.id);
    }
  }
  return out.slice(0, take);
}

/**
 * 年度別通し模試の出題セットを組む（単一科目）。
 *
 * - 対象科目の問題だけを使う。
 * - area タグ＋頻度マップがあれば頻度重み付け、無ければ topic spread。
 * - 同一 topic の重複は避ける（問題が尽きたら重複を許して count に近づける）。
 *
 * @returns 出題セット（最大 count 件・全問が subject に一致・重複 ID なし）。
 */
export function buildYearMock(problems: readonly Problem[], opts: YearMockOptions): Problem[] {
  const rng = opts.rng ?? Math.random;
  const take = Math.max(0, Math.floor(opts.count));
  if (take === 0) return [];
  const pool = problems.filter((p) => p.subject === opts.subject);
  if (pool.length === 0) return [];

  if (opts.areaOfProblem && opts.areaFrequency) {
    return sampleByAreaFrequency(pool, take, rng, opts.areaOfProblem, opts.areaFrequency);
  }
  return sampleByTopicSpread(pool, take, rng);
}
