/**
 * supervision.ts — 監修（合格者レビュー）フローのカバレッジ分析（純関数）。
 *
 * 「監修」は人間（電験合格者）による専門レビュー行為であり、コードでは代行できない。
 * 本モジュールは **監修の進捗を可視化し、レビュー対象を絞り込む土台** を提供する:
 *  - どの問題が監修待ちか（validated だが supervisor_checked=false）
 *  - 科目・論点ごとの監修カバレッジ（未監修の論点はどこか）
 *
 * `validation.supervisor_checked` を立てるのは実際に監修した人間のみ。本コードは判定しない。
 */
import type { Problem } from "../engine/schema.js";

/** 監修パイプラインの段階。 */
export type SupervisionStage = "needs_validation" | "needs_supervision" | "supervised";

/**
 * 問題の監修段階を判定する。
 *  - supervised: `supervisor_checked=true`（合格者監修済み）
 *  - needs_supervision: validated/published かつ検証4項目 true だが未監修（=レビュー待ち）
 *  - needs_validation: それ以外（draft 等・まず検証が必要）
 */
export function supervisionStage(p: Problem): SupervisionStage {
  if (p.validation.supervisor_checked) return "supervised";
  const v = p.validation;
  const validated =
    (p.status === "validated" || p.status === "published") &&
    v.solver_checked &&
    v.human_checked &&
    v.clean_answer &&
    v.physically_valid;
  return validated ? "needs_supervision" : "needs_validation";
}

export interface SubjectCoverage {
  subject: string;
  total: number;
  supervised: number;
  needsSupervision: number;
  needsValidation: number;
  /** その科目の全論点数。 */
  topicsTotal: number;
  /** 監修済み問題が1件以上ある論点数。 */
  topicsSupervised: number;
}

export interface ReviewItem {
  id: string;
  subject: string;
  topic: string;
  difficulty: number;
  format: string;
}

export interface SupervisionReport {
  total: number;
  supervised: number;
  needsSupervision: number;
  needsValidation: number;
  /** 監修カバレッジ率 = supervised / total（total=0 のときは 0）。 */
  coverage: number;
  bySubject: SubjectCoverage[];
  /** 監修待ち（validated だが未監修）の問題キュー（id 昇順）。 */
  reviewQueue: ReviewItem[];
}

/** 問題集合から監修カバレッジレポートを作る純関数。 */
export function supervisionReport(problems: Problem[]): SupervisionReport {
  let supervised = 0;
  let needsSupervision = 0;
  let needsValidation = 0;

  // 科目 → 集計
  const subjectMap = new Map<
    string,
    { total: number; supervised: number; needsSupervision: number; needsValidation: number }
  >();
  // 科目 → 論点 → 監修済みか
  const subjectTopics = new Map<string, Map<string, boolean>>();
  const reviewQueue: ReviewItem[] = [];

  for (const p of problems) {
    const stage = supervisionStage(p);
    if (stage === "supervised") supervised++;
    else if (stage === "needs_supervision") needsSupervision++;
    else needsValidation++;

    const s = subjectMap.get(p.subject) ?? { total: 0, supervised: 0, needsSupervision: 0, needsValidation: 0 };
    s.total++;
    if (stage === "supervised") s.supervised++;
    else if (stage === "needs_supervision") s.needsSupervision++;
    else s.needsValidation++;
    subjectMap.set(p.subject, s);

    const topics = subjectTopics.get(p.subject) ?? new Map<string, boolean>();
    topics.set(p.topic, (topics.get(p.topic) ?? false) || stage === "supervised");
    subjectTopics.set(p.subject, topics);

    if (stage === "needs_supervision") {
      reviewQueue.push({
        id: p.id,
        subject: p.subject,
        topic: p.topic,
        difficulty: p.difficulty,
        format: p.format ?? "multiple_choice",
      });
    }
  }

  const bySubject: SubjectCoverage[] = [...subjectMap.entries()]
    .map(([subject, c]) => {
      const topics = subjectTopics.get(subject) ?? new Map<string, boolean>();
      let topicsSupervised = 0;
      for (const ok of topics.values()) if (ok) topicsSupervised++;
      return {
        subject,
        total: c.total,
        supervised: c.supervised,
        needsSupervision: c.needsSupervision,
        needsValidation: c.needsValidation,
        topicsTotal: topics.size,
        topicsSupervised,
      };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject, "ja"));

  reviewQueue.sort((a, b) => a.id.localeCompare(b.id));

  const total = problems.length;
  return {
    total,
    supervised,
    needsSupervision,
    needsValidation,
    coverage: total > 0 ? supervised / total : 0,
    bySubject,
    reviewQueue,
  };
}

/** レポートを人間可読なテキストに整形する。 */
export function formatSupervisionReport(r: SupervisionReport): string {
  const pct = (r.coverage * 100).toFixed(1);
  const lines = [
    "DENKEN-OS 監修カバレッジ",
    `- 監修カバレッジ: ${r.supervised}/${r.total}（${pct}%）`,
    `- 監修待ち（validated・未監修）: ${r.needsSupervision}`,
    `- 要検証（draft 等）: ${r.needsValidation}`,
    "科目別:",
  ];
  for (const s of r.bySubject) {
    lines.push(
      `- ${s.subject}: 監修 ${s.supervised}/${s.total}・待ち ${s.needsSupervision}・論点 ${s.topicsSupervised}/${s.topicsTotal} 監修済み`,
    );
  }
  if (r.reviewQueue.length > 0) {
    lines.push(`監修待ちキュー（${r.reviewQueue.length}件・先頭最大10件）:`);
    for (const q of r.reviewQueue.slice(0, 10)) {
      lines.push(`- ${q.id} [${q.subject}/${q.topic}] ★${q.difficulty} ${q.format}`);
    }
    if (r.reviewQueue.length > 10) lines.push(`- … ほか ${r.reviewQueue.length - 10} 件（packet で全件出力）`);
  } else {
    lines.push("監修待ちキュー: なし");
  }
  return lines.join("\n");
}

export type MarkOutcome = "marked" | "already_supervised" | "field_missing";

export interface MarkResult {
  text: string;
  outcome: MarkOutcome;
}

/**
 * 問題 JSON テキスト中の `"supervisor_checked": false` を `true` へ書き換える（純関数）。
 *
 * 整形（インデント・他フィールド）を一切壊さないよう、対象キーの値だけを置換する。
 * 合格者が監修済みと判断した問題に対して人間が実行する（コードが監修を代行するのではない）。
 *
 * @returns marked=書換成功 / already_supervised=既に true / field_missing=フィールドなし
 */
export function markSupervisedInJson(jsonText: string): MarkResult {
  if (/"supervisor_checked"\s*:\s*true\b/.test(jsonText)) {
    return { text: jsonText, outcome: "already_supervised" };
  }
  const re = /("supervisor_checked"\s*:\s*)false\b/;
  if (!re.test(jsonText)) {
    return { text: jsonText, outcome: "field_missing" };
  }
  return { text: jsonText.replace(re, "$1true"), outcome: "marked" };
}
