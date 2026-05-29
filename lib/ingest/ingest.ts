/**
 * ingest.ts — 過去問の構造化取込（04-pastexam-ingest）。
 *
 * 核心の設計判断（著作権＝根本対策）:
 *  - 出典メタ（年度・区分・科目）を必須にし、欠落データは取込を弾く。
 *  - 生の過去問は source.type='past_exam_quoted' を付与し、生成/改題問題と分離。
 *  - 数式/回路図は「要手修正」フラグを立てる（OCR誤りを公開前に止める）。
 *  - 同一問題の重複を検出・スキップ。
 *
 * ※ OCR/PDFパースは行わない（誤りを検算なしで公開しないため）。
 *   入力は人手 or 別工程で構造化済みのレコード。
 */
import type { Subject } from "../engine/schema.js";

export interface RawPastExam {
  year?: string; // 例 "令和5年度"
  examType?: string; // 例 "第二種 一次"
  subject?: Subject;
  statement?: string;
  /** 図/回路図の参照（あれば要手修正フラグ対象）。 */
  figureRef?: string;
  /** 数式プレースホルダを含むか。 */
  hasMathPlaceholder?: boolean;
}

export interface PastExamRecord {
  citation: string;
  sourceType: "past_exam_quoted";
  subject: Subject;
  statement: string;
  figureRef?: string;
  needsManualFix: boolean;
}

export interface IngestResult {
  accepted: PastExamRecord[];
  rejected: { raw: RawPastExam; reason: string }[];
  duplicates: number;
  manualFixCount: number;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").trim();
}

/** 出典メタが揃っているか（年度・区分・科目・問題文）。 */
function missingMeta(r: RawPastExam): string | null {
  if (!r.year) return "year(年度)欠落";
  if (!r.examType) return "examType(試験区分)欠落";
  if (!r.subject) return "subject(科目)欠落";
  if (!r.statement || normalize(r.statement).length === 0) return "statement(問題文)欠落";
  return null;
}

/** 生の過去問レコード群を構造化取込する。 */
export function ingest(raws: RawPastExam[]): IngestResult {
  const accepted: PastExamRecord[] = [];
  const rejected: { raw: RawPastExam; reason: string }[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let manualFixCount = 0;

  for (const r of raws) {
    const missing = missingMeta(r);
    if (missing) {
      rejected.push({ raw: r, reason: missing });
      continue;
    }
    const key = normalize(r.statement!);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);

    const needsManualFix = Boolean(r.figureRef) || Boolean(r.hasMathPlaceholder);
    if (needsManualFix) manualFixCount += 1;

    accepted.push({
      citation: `${r.year} ${r.examType} ${r.subject}`,
      sourceType: "past_exam_quoted",
      subject: r.subject!,
      statement: r.statement!,
      figureRef: r.figureRef,
      needsManualFix,
    });
  }

  return { accepted, rejected, duplicates, manualFixCount };
}
