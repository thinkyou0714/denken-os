/**
 * pastexam-coverage.ts — 「過去問20年分」の出題分野カバレッジを定量化する純関数群。
 *
 * 各テンプレートの `pastExam.area`（出題分野メタ）を `pastexam-areas.ts` の
 * 正準分類と突き合わせ、科目ごとに「20年スパンで頻出の分野をどれだけカバーできているか」を
 * 算出する。傾向分析・改題出題の重み付け・未カバー分野の優先補強に使う。
 *
 * 著作権（docs/automation/04 §1）: 逐語の問題文・数値は一切扱わない。出題分野メタのみ。
 */
import type { Subject } from "../engine/schema.js";
import {
  areasForSubject,
  type CanonicalArea,
  PASTEXAM_WINDOW,
  trackedSubjects,
} from "../engine/templates/pastexam-areas.js";
import type { PastExamCoverage, Template } from "../engine/templates/types.js";

/** カバレッジ計算に必要な最小のテンプレート情報（テスト時に手組みできるよう絞る）。 */
export interface TemplateLike {
  topic: string;
  subject: Subject;
  pastExam?: PastExamCoverage;
}

export interface AreaCoverage {
  area: string;
  frequency: CanonicalArea["frequency"];
  /** この分野をカバーするテンプレート数。 */
  templateCount: number;
  /** カバーするテンプレートが1件以上あるか。 */
  covered: boolean;
  /** この分野をカバーするテンプレートの topic 一覧（昇順）。 */
  topics: string[];
}

export interface SubjectCoverage {
  subject: Subject;
  areas: AreaCoverage[];
  totalAreas: number;
  coveredAreas: number;
  /** covered / total（0..1）。total=0 のときは 1（評価対象なし＝欠落なし）。 */
  coverageRatio: number;
  /** 未カバーの high 頻度分野（優先補強対象・昇順）。 */
  uncoveredHighFrequency: string[];
  /** pastExam メタを持つテンプレ数 / 当該科目の総テンプレ数。 */
  templatesWithMeta: number;
  templatesTotal: number;
  /** メタの area が正準分類に存在しない（綴り揺れ等）テンプレの topic 一覧。 */
  unknownAreaTopics: string[];
}

export interface PastExamCoverageReport {
  window: readonly [number, number];
  subjects: SubjectCoverage[];
  totalTemplates: number;
  templatesWithMeta: number;
  /** 追跡対象科目全体の平均カバレッジ（単純平均, 0..1）。 */
  overallCoverageRatio: number;
}

function round(value: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/** 1科目分のカバレッジを算出する。 */
export function computeSubjectCoverage(subject: Subject, templates: TemplateLike[]): SubjectCoverage {
  const subjectTemplates = templates.filter((t) => t.subject === subject);
  const canonical = areasForSubject(subject);
  const canonicalNames = new Set(canonical.map((a) => a.area));

  // area名 → カバーする topic 群。
  const byArea = new Map<string, string[]>();
  const unknownAreaTopics: string[] = [];
  let templatesWithMeta = 0;
  for (const t of subjectTemplates) {
    if (!t.pastExam) continue;
    templatesWithMeta += 1;
    const { area } = t.pastExam;
    if (!canonicalNames.has(area)) {
      unknownAreaTopics.push(t.topic);
      continue;
    }
    const list = byArea.get(area) ?? [];
    list.push(t.topic);
    byArea.set(area, list);
  }

  const areas: AreaCoverage[] = canonical.map((c) => {
    const topics = (byArea.get(c.area) ?? []).slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return {
      area: c.area,
      frequency: c.frequency,
      templateCount: topics.length,
      covered: topics.length > 0,
      topics,
    };
  });

  const coveredAreas = areas.filter((a) => a.covered).length;
  const totalAreas = areas.length;
  const uncoveredHighFrequency = areas
    .filter((a) => !a.covered && a.frequency === "high")
    .map((a) => a.area)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  return {
    subject,
    areas,
    totalAreas,
    coveredAreas,
    coverageRatio: totalAreas === 0 ? 1 : round(coveredAreas / totalAreas),
    uncoveredHighFrequency,
    templatesWithMeta,
    templatesTotal: subjectTemplates.length,
    unknownAreaTopics: unknownAreaTopics.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
  };
}

/** 全追跡科目のカバレッジレポートを算出する。 */
export function computePastExamCoverage(templates: TemplateLike[]): PastExamCoverageReport {
  const subjects = trackedSubjects().map((s) => computeSubjectCoverage(s, templates));
  const templatesWithMeta = templates.filter((t) => t.pastExam).length;
  const overall =
    subjects.length === 0 ? 1 : round(subjects.reduce((sum, s) => sum + s.coverageRatio, 0) / subjects.length);
  return {
    window: PASTEXAM_WINDOW,
    subjects,
    totalTemplates: templates.length,
    templatesWithMeta,
    overallCoverageRatio: overall,
  };
}

/** Template（registry の値）から TemplateLike に落とす小ヘルパー。 */
export function toTemplateLike(t: Template): TemplateLike {
  // exactOptionalPropertyTypes: pastExam 未設定時はキー自体を省く。
  return { topic: t.topic, subject: t.subject, ...(t.pastExam ? { pastExam: t.pastExam } : {}) };
}

/** レポートを人間可読なテキストに整形する。 */
export function formatCoverageReport(report: PastExamCoverageReport): string {
  const [from, to] = report.window;
  const lines: string[] = [];
  lines.push(`過去問カバレッジ（${from}–${to} の主要出題分野 / 逐語引用なし・出題分野メタ集計）`);
  lines.push(
    `  全体: 追跡科目平均 ${(report.overallCoverageRatio * 100).toFixed(0)}% / ` +
      `メタ付与 ${report.templatesWithMeta}/${report.totalTemplates} テンプレ`,
  );
  for (const s of report.subjects) {
    lines.push("");
    lines.push(
      `■ ${s.subject}: ${s.coveredAreas}/${s.totalAreas} 分野 ` +
        `(${(s.coverageRatio * 100).toFixed(0)}%) / メタ付与 ${s.templatesWithMeta}/${s.templatesTotal} テンプレ`,
    );
    for (const a of s.areas) {
      const mark = a.covered ? "✓" : "·";
      const freq = a.frequency === "high" ? "★毎年" : a.frequency === "mid" ? "・数年" : "・稀";
      const topics = a.covered ? `: ${a.topics.join(", ")}` : "";
      lines.push(`  ${mark} [${freq}] ${a.area} (${a.templateCount})${topics}`);
    }
    if (s.uncoveredHighFrequency.length > 0) {
      lines.push(`  ⚠ 未カバーの頻出分野（優先補強）: ${s.uncoveredHighFrequency.join(", ")}`);
    }
    if (s.unknownAreaTopics.length > 0) {
      lines.push(`  ⚠ 正準分類に無いarea指定: ${s.unknownAreaTopics.join(", ")}`);
    }
  }
  return lines.join("\n");
}
