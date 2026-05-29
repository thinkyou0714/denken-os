/**
 * rubric.ts — 記述式(descriptive)の部分点採点（純関数・DOM非依存）。
 *
 * 二次の記述は自動採点できないため、模範解答を採点観点(rubric)に分解し、
 * 利用者が観点ごとに「満点/部分/未達」を自己申告して部分点を合算する。
 * 確定の責任を「ぶれない場所（配点の合算）」に置き、点数をLLMに出させない。
 *
 * 設計: 純関数のみ。UI(web) と将来のサーバ集計の両方から使える。
 */

import type { RubricItem } from "../engine/schema.js";
import { PASS_LINE } from "./lesson.js";

/** 自己採点のマーク。満点/部分点(半分)/未達。 */
export type RubricMark = "full" | "partial" | "none";

/** 部分点の比率（partial=半分）。 */
const MARK_RATIO: Record<RubricMark, number> = { full: 1, partial: 0.5, none: 0 };

export interface RubricMarkInput {
  id: string;
  mark: RubricMark;
}

export interface RubricItemScore {
  id: string;
  criterion: string;
  points: number;
  awarded: number;
  mark: RubricMark;
  required: boolean;
}

export interface RubricScore {
  /** 観点別の獲得点。 */
  items: RubricItemScore[];
  maxPoints: number;
  awarded: number;
  /** 得点率(0..1)。満点0なら0。 */
  ratio: number;
  /** 合格ライン(60%)到達かつ必須観点を満たすか。 */
  passed: boolean;
  /** 未達(none)だった必須観点のID。 */
  missingRequired: string[];
  /** 落とした（満点でない）観点のID（弱点分析用）。 */
  weakItemIds: string[];
}

/** rubric の満点（配点合計）。 */
export function maxPoints(rubric: RubricItem[]): number {
  return rubric.reduce((a, r) => a + r.points, 0);
}

/**
 * 自己採点マークから部分点を集計する。
 * marks に無い項目は "none"（未採点=未達）として扱う。
 */
export function scoreRubric(rubric: RubricItem[], marks: RubricMarkInput[]): RubricScore {
  const markById = new Map(marks.map((m) => [m.id, m.mark]));
  const items: RubricItemScore[] = rubric.map((r) => {
    const mark = markById.get(r.id) ?? "none";
    return {
      id: r.id,
      criterion: r.criterion,
      points: r.points,
      awarded: Number((r.points * MARK_RATIO[mark]).toFixed(4)),
      mark,
      required: r.required ?? false,
    };
  });

  const max = maxPoints(rubric);
  const awarded = Number(items.reduce((a, i) => a + i.awarded, 0).toFixed(4));
  const ratio = max > 0 ? awarded / max : 0;
  const missingRequired = items.filter((i) => i.required && i.mark === "none").map((i) => i.id);
  const weakItemIds = items.filter((i) => i.mark !== "full").map((i) => i.id);

  // 合格は「得点率が合格ライン以上」かつ「必須観点を未達にしていない」。
  const passed = ratio >= PASS_LINE && missingRequired.length === 0;

  return { items, maxPoints: max, awarded, ratio, passed, missingRequired, weakItemIds };
}

/**
 * 利用者の自由記述から、各観点のキーワードヒット率を返す（自己採点の補助）。
 * 表記ゆれを抑えるため、空白を除去し小文字化して部分一致で判定する。
 * あくまで「ヒント」で、確定はしない（記述の正誤は人が判断）。
 */
export interface KeywordHit {
  id: string;
  hit: number;
  total: number;
  missing: string[];
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export function keywordHits(rubric: RubricItem[], answerText: string): KeywordHit[] {
  const hay = normalize(answerText);
  return rubric
    .filter((r) => r.keywords && r.keywords.length > 0)
    .map((r) => {
      const kws = r.keywords ?? [];
      const missing = kws.filter((k) => !hay.includes(normalize(k)));
      return { id: r.id, hit: kws.length - missing.length, total: kws.length, missing };
    });
}

/** 採点結果の講評（表示・読み上げ用の自然文）。 */
export function rubricFeedback(score: RubricScore): string {
  if (score.maxPoints === 0) return "この問題には採点ルーブリックが設定されていません。";
  const pct = Math.round(score.ratio * 100);
  const head = `${score.awarded}/${score.maxPoints}点（${pct}%）。`;
  if (score.missingRequired.length > 0) {
    return `${head}必須の観点（${score.missingRequired.join("、")}）が抜けています。ここは合否に直結します。`;
  }
  if (score.passed) {
    return `${head}合格ライン60%を超えています。落とした観点を詰めれば満点が狙えます。`;
  }
  return `${head}合格ライン60%まであと少し。部分点を取りこぼした観点を復習しましょう。`;
}
