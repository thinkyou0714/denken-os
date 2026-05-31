/**
 * quality.ts — 問題の「品質」を測る・担保するユーティリティ。
 *
 * 設計の根拠（docs/automation/14-question-quality-best-practices.md）:
 *  - Haladyna/Downing/Rodriguez の項目作成31則。特に「誤答は妥当に(#29)」「典型ミスから作る(#30)」。
 *  - Rodriguez(2005): 機能する誤答は 3 個前後が最適。5択に水増しすると非機能誤答が増える
 *    → 本プロジェクトは「機能する誤答だけを置く」方針（選択肢数を無理に増やさない）。
 *  - 数値採点は相対許容誤差（業界標準 1〜3%）で丸め差を吸収する。
 *
 * validate.ts が「正しさ（schema/不変条件）」を担保するのに対し、
 * 本モジュールは「良問らしさ（誤答の妥当性・完全性・重複の少なさ）」を測る。
 */
import type { Problem } from "./schema.js";

/**
 * 数値採点の許容誤差（相対 + 下限フロア）。13/14-best-practices §数値採点。
 * 既定: |answer| の 1%、ただし最低 0.01。見やすさのため有効2桁に丸める。
 */
export function gradingTolerance(answer: number, relative = 0.01, floor = 0.01): number {
  const raw = Math.max(Math.abs(answer) * relative, floor);
  if (raw === 0) return floor;
  return Number(raw.toPrecision(2));
}

export type Severity = "error" | "warn" | "info";

export interface QualityFinding {
  severity: Severity;
  code: string;
  message: string;
}

export interface QualityResult {
  id: string;
  /** 0–100。error は大きく、warn は小さく減点。 */
  score: number;
  findings: QualityFinding[];
}

/**
 * 誤答妥当性の段階判定（Haladyna #29「誤答は妥当に」）。
 *  - broken: バグ相当（符号反転・0・1000倍超の桁違い）→ error。
 *  - extreme: 妥当だが answer と桁が大きく離れる（1/50〜50 を外れる）→ warn（情報）。
 *    定量問題では「×100 忘れ」等の概念ミス由来で桁違いの選択肢が正当に生じうるため、
 *    error ではなく warn に留める（5%ルール上は機能しうる）。
 *  - ok: それ以外。
 *
 * 注意: 物理的に荒唐無稽（例: 28800 min⁻¹ の同期速度）かどうかは単位を持たない本関数では
 * 判定できない。テンプレート側で「ありえない値の誤答」を作らないこと（同期速度テンプレ参照）。
 */
const BROKEN_LOW = 1 / 1000;
const BROKEN_HIGH = 1000;
const EXTREME_LOW = 1 / 50;
const EXTREME_HIGH = 50;

export function distractorSanity(answer: number, distractor: number): "ok" | "extreme" | "broken" {
  if (distractor === 0) return answer === 0 ? "ok" : "broken";
  if (answer === 0) return "broken";
  if (Math.sign(distractor) !== Math.sign(answer)) return "broken";
  const ratio = Math.abs(distractor / answer);
  if (ratio < BROKEN_LOW || ratio > BROKEN_HIGH) return "broken";
  if (ratio < EXTREME_LOW || ratio > EXTREME_HIGH) return "extreme";
  return "ok";
}

/** 1 問の品質を評価する。 */
export function assessProblem(p: Problem): QualityResult {
  const findings: QualityFinding[] = [];
  const add = (severity: Severity, code: string, message: string) => findings.push({ severity, code, message });

  const format = p.format ?? "multiple_choice";

  if (format === "multiple_choice") {
    const choices = p.choices ?? [];
    // 選択肢の重複（key の手がかりになる致命的欠陥）
    if (new Set(choices).size !== choices.length) add("error", "duplicate_choices", "選択肢に重複があります");
    if (!choices.includes(p.answer)) add("error", "answer_not_in_choices", "answer が choices にありません");
    // Rodriguez: 機能する誤答 3 個前後（=選択肢4）が最適。3〜6 を許容、外れは warn。
    if (choices.length < 3) add("warn", "too_few_choices", `選択肢が ${choices.length} 個（3以上が望ましい）`);
    if (choices.length > 6) add("warn", "too_many_choices", `選択肢が ${choices.length} 個（非機能誤答の温床）`);

    // 誤答のサニティ（数値選択肢のとき）
    const ansNum = Number(p.answer);
    if (!Number.isNaN(ansNum)) {
      for (const c of choices) {
        if (c === p.answer) continue;
        const cn = Number(c);
        if (Number.isNaN(cn)) continue;
        const s = distractorSanity(ansNum, cn);
        if (s === "broken") add("error", "broken_distractor", `誤答 "${c}" がサニティ外（符号反転/0/桁違い）`);
        else if (s === "extreme") add("warn", "extreme_distractor", `誤答 "${c}" が answer と桁が大きく離れています`);
      }
    }

    // 誤答解説（最大の学習資産）の網羅
    if (!p.choice_explanations || p.choice_explanations.length === 0) {
      add("warn", "no_choice_explanations", "誤答解説(choice_explanations)がありません");
    } else if (p.choice_explanations.length !== choices.length) {
      add("warn", "partial_choice_explanations", "誤答解説が全選択肢を網羅していません");
    }
  }

  if (format === "numeric") {
    if (!p.numeric || !(p.numeric.tolerance > 0)) {
      add("warn", "no_numeric_tolerance", "numeric.tolerance が未設定/非正です");
    } else {
      const ans = Math.abs(Number(p.answer));
      // 相対 20% を超える緩い許容、または極端に厳しい許容は warn。
      if (!Number.isNaN(ans) && ans > 0) {
        const rel = p.numeric.tolerance / ans;
        if (rel > 0.2) add("warn", "loose_tolerance", "許容誤差が緩すぎます(相対>20%)");
      }
    }
  }

  if (format === "descriptive" && (!p.grading_points || p.grading_points.length === 0)) {
    add("warn", "no_grading_points", "記述式に採点観点(grading_points)がありません");
  }

  // 完全性（学習体験の質）
  if (!p.formulas || p.formulas.length === 0) add("warn", "no_formulas", "使用公式(formulas)がありません");
  if (!p.learning_objectives || p.learning_objectives.length === 0)
    add("warn", "no_learning_objectives", "学習目標(learning_objectives)がありません");
  if (!p.hints || p.hints.length === 0) add("warn", "no_hints", "ヒント(hints)がありません");
  if (!p.tags || p.tags.length === 0) add("warn", "no_tags", "タグ(tags)がありません");
  if (!p.estimated_time_sec) add("info", "no_estimated_time", "想定解答時間(estimated_time_sec)がありません");
  if (p.solution.length < 2) add("warn", "thin_solution", "解説ステップが少なすぎます");

  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.filter((f) => f.severity === "warn").length;
  const score = Math.max(0, 100 - errors * 25 - warns * 5);
  return { id: p.id, score, findings };
}

export interface QualitySummary {
  count: number;
  avgScore: number;
  minScore: number;
  errorCount: number;
  warnCount: number;
  /** 重複（subject|topic|statement|answer が同一）のグループ数と重複問題数。 */
  duplicateGroups: number;
  duplicateProblems: number;
  results: QualityResult[];
}

function signature(p: Problem): string {
  return [p.subject, p.topic, p.statement, p.answer].join("|");
}

/** 複数問題の品質を集計する（重複検出を含む）。 */
export function summarizeQuality(problems: Problem[]): QualitySummary {
  const results = problems.map(assessProblem);
  const scores = results.map((r) => r.score);
  const errorCount = results.reduce((a, r) => a + r.findings.filter((f) => f.severity === "error").length, 0);
  const warnCount = results.reduce((a, r) => a + r.findings.filter((f) => f.severity === "warn").length, 0);

  const bySig = new Map<string, number>();
  for (const p of problems) bySig.set(signature(p), (bySig.get(signature(p)) ?? 0) + 1);
  let duplicateGroups = 0;
  let duplicateProblems = 0;
  for (const n of bySig.values()) {
    if (n > 1) {
      duplicateGroups++;
      duplicateProblems += n - 1;
    }
  }

  return {
    count: problems.length,
    avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    minScore: scores.length ? Math.min(...scores) : 0,
    errorCount,
    warnCount,
    duplicateGroups,
    duplicateProblems,
    results,
  };
}
