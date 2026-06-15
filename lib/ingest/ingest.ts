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

/**
 * 出典フォーマット（年度＋区分＋科目）を検証するパーサ（II-139）。
 *
 * 不完全な出典（年度のみ・科目のみ等）を取込前に検出し、後から追跡不能な
 * 著作権リスクを防ぐ。
 *
 * @param year - 年度文字列。「令和X年度」または「平成X年度」の形式を期待。
 * @param examType - 試験区分文字列。空でないこと。
 * @param subject - 科目。undefined でないこと。
 * @returns `{ ok: true, citation }` または `{ ok: false, reason }`。
 *
 * @example
 * ```ts
 * parseCitation("令和5年度", "第二種 一次", "理論")
 * // => { ok: true, citation: "令和5年度 第二種 一次 理論" }
 *
 * parseCitation("2023", "一次", "理論")
 * // => { ok: false, reason: "year は「令和X年度」または「平成X年度」の形式が必要です: 2023" }
 * ```
 */
export function parseCitation(
  year: string | undefined,
  examType: string | undefined,
  subject: string | undefined,
): { ok: true; citation: string } | { ok: false; reason: string } {
  if (!year || year.trim().length === 0) {
    return { ok: false, reason: "year(年度) が空です" };
  }
  // 「令和X年度」「平成X年度」「昭和X年度」のいずれか（X は正整数）を許容。
  const yearPattern = /^(令和|平成|昭和)\d+年度$/;
  if (!yearPattern.test(year.trim())) {
    return { ok: false, reason: `year は「令和X年度」または「平成X年度」の形式が必要です: ${year}` };
  }
  if (!examType || examType.trim().length === 0) {
    return { ok: false, reason: "examType(試験区分) が空です" };
  }
  if (!subject || (subject as string).trim().length === 0) {
    return { ok: false, reason: "subject(科目) が空です" };
  }
  return { ok: true, citation: `${year.trim()} ${examType.trim()} ${subject}` };
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
    // missingMeta(r) が null を返した場合は statement/subject/year/examType の存在が保証される。
    // parseCitation でフォーマットを検証（II-139）: 年度が正しい形式かを確認する。
    const citationResult = parseCitation(r.year, r.examType, r.subject as string | undefined);
    if (!citationResult.ok) {
      rejected.push({ raw: r, reason: citationResult.reason });
      continue;
    }

    const key = normalize(r.statement as string);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);

    const needsManualFix = Boolean(r.figureRef) || Boolean(r.hasMathPlaceholder);
    if (needsManualFix) manualFixCount += 1;

    accepted.push({
      citation: citationResult.citation,
      sourceType: "past_exam_quoted",
      subject: r.subject as Subject,
      statement: r.statement as string,
      ...(r.figureRef !== undefined && { figureRef: r.figureRef }),
      needsManualFix,
    });
  }

  return { accepted, rejected, duplicates, manualFixCount };
}
