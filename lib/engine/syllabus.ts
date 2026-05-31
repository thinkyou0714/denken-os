/**
 * syllabus.ts — 電験(電気主任技術者試験)の機械可読シラバス。
 *
 * 目的（13-best-practices §E）:
 *   「どの学習サービスよりも問題が充実している」を **定量化** する。
 *   公式の出題範囲を科目×論点で列挙し、テンプレ／問題で何%が埋まっているかを算出する。
 *   被覆レポート（scripts/syllabus-coverage.ts）と CI 最小被覆ゲートの基礎になる。
 *
 * 「covered（カバー済み）」の定義:
 *   シラバスの topic 文字列が、テンプレート topic または data/problems の topic と一致すること。
 *   未カバー論点は「次に作るべき問題」を示す（空白の可視化）。
 */
import type { Exam, Subject } from "./schema.js";

export type Priority = "high" | "medium" | "low";

export interface SyllabusEntry {
  subject: Subject;
  topic: string;
  /** 出題頻度に基づく優先度（high から埋める）。 */
  priority: Priority;
  /** 主に出題される試験区分。 */
  exams: Exam[];
}

/**
 * 電験の主要論点。現行テンプレートの topic はそのまま covered として数える。
 * （網羅的な「教科書の目次」ではなく、実出題の頻出論点を厳選した実務シラバス）
 */
export const SYLLABUS: SyllabusEntry[] = [
  // ============ 理論 ============
  { subject: "理論", topic: "オームの法則", priority: "high", exams: ["denken3"] },
  { subject: "理論", topic: "直並列合成抵抗", priority: "high", exams: ["denken3"] },
  { subject: "理論", topic: "分圧の法則", priority: "high", exams: ["denken3"] },
  { subject: "理論", topic: "分流の法則", priority: "high", exams: ["denken3"] },
  { subject: "理論", topic: "キルヒホッフの法則", priority: "high", exams: ["denken3", "denken2_primary"] },
  { subject: "理論", topic: "ブリッジ回路の平衡条件", priority: "medium", exams: ["denken3"] },
  { subject: "理論", topic: "テブナンの定理", priority: "medium", exams: ["denken3", "denken2_primary"] },
  { subject: "理論", topic: "重ね合わせの理", priority: "medium", exams: ["denken3"] },
  { subject: "理論", topic: "最大電力供給の定理", priority: "medium", exams: ["denken3"] },
  { subject: "理論", topic: "RLC直列回路のインピーダンス", priority: "high", exams: ["denken3"] },
  { subject: "理論", topic: "三相交流電力", priority: "high", exams: ["denken3", "denken2_primary"] },
  { subject: "理論", topic: "直列共振", priority: "medium", exams: ["denken3"] },
  { subject: "理論", topic: "並列共振", priority: "low", exams: ["denken3"] },
  { subject: "理論", topic: "クーロンの法則（静電力）", priority: "medium", exams: ["denken3"] },
  { subject: "理論", topic: "コンデンサの静電エネルギー", priority: "high", exams: ["denken3"] },
  { subject: "理論", topic: "電界と電位", priority: "medium", exams: ["denken3"] },
  { subject: "理論", topic: "磁界（アンペアの法則）", priority: "medium", exams: ["denken3"] },
  { subject: "理論", topic: "電磁力", priority: "medium", exams: ["denken3"] },
  { subject: "理論", topic: "電磁誘導", priority: "medium", exams: ["denken3"] },
  { subject: "理論", topic: "RC・RL過渡現象", priority: "medium", exams: ["denken3", "denken2_primary"] },
  { subject: "理論", topic: "電子回路（トランジスタ・オペアンプ）", priority: "low", exams: ["denken3"] },
  { subject: "理論", topic: "指示計器・測定", priority: "low", exams: ["denken3"] },

  // ============ 電力 ============
  { subject: "電力", topic: "水力発電の出力", priority: "high", exams: ["denken3"] },
  { subject: "電力", topic: "揚水発電の効率", priority: "medium", exams: ["denken3"] },
  { subject: "電力", topic: "火力発電の熱効率", priority: "high", exams: ["denken3"] },
  { subject: "電力", topic: "原子力発電", priority: "low", exams: ["denken3"] },
  { subject: "電力", topic: "変圧器の並行運転", priority: "medium", exams: ["denken3"] },
  { subject: "電力", topic: "パーセントインピーダンスと短絡電流", priority: "high", exams: ["denken3"] },
  { subject: "電力", topic: "単相線路の電圧降下", priority: "high", exams: ["denken3"] },
  { subject: "電力", topic: "三相線路の電圧降下", priority: "high", exams: ["denken3"] },
  { subject: "電力", topic: "電力損失", priority: "medium", exams: ["denken3"] },
  { subject: "電力", topic: "力率改善用コンデンサ容量", priority: "high", exams: ["denken3"] },
  { subject: "電力", topic: "架空電線のたるみ（弛度）", priority: "medium", exams: ["denken3"] },
  { subject: "電力", topic: "ケーブルの充電電流", priority: "low", exams: ["denken3"] },
  { subject: "電力", topic: "中性点接地方式", priority: "medium", exams: ["denken3"] },
  { subject: "電力", topic: "需要率", priority: "high", exams: ["denken3"] },
  { subject: "電力", topic: "負荷率", priority: "high", exams: ["denken3"] },
  { subject: "電力", topic: "不等率", priority: "medium", exams: ["denken3"] },
  { subject: "電力", topic: "電気材料", priority: "low", exams: ["denken3"] },

  // ============ 機械 ============
  { subject: "機械", topic: "変圧器の効率", priority: "high", exams: ["denken3"] },
  { subject: "機械", topic: "変圧器の並行運転", priority: "medium", exams: ["denken3"] },
  { subject: "機械", topic: "直流電動機の逆起電力", priority: "high", exams: ["denken3"] },
  { subject: "機械", topic: "直流電動機の回転速度", priority: "high", exams: ["denken3"] },
  { subject: "機械", topic: "直流発電機の誘導起電力", priority: "medium", exams: ["denken3"] },
  { subject: "機械", topic: "同期速度", priority: "high", exams: ["denken3"] },
  { subject: "機械", topic: "同期発電機の出力・短絡比", priority: "medium", exams: ["denken3"] },
  { subject: "機械", topic: "誘導電動機の回転速度", priority: "high", exams: ["denken3"] },
  { subject: "機械", topic: "誘導電動機の二次入力比例配分", priority: "high", exams: ["denken3"] },
  { subject: "機械", topic: "誘導電動機のトルク", priority: "medium", exams: ["denken3"] },
  { subject: "機械", topic: "単相全波整流回路の平均電圧", priority: "high", exams: ["denken3"] },
  { subject: "機械", topic: "昇圧チョッパの出力電圧", priority: "medium", exams: ["denken3"] },
  { subject: "機械", topic: "自動制御（伝達関数・ブロック線図）", priority: "medium", exams: ["denken3"] },
  { subject: "機械", topic: "照度計算（逆二乗則）", priority: "medium", exams: ["denken3"] },
  { subject: "機械", topic: "電熱（必要電力量）", priority: "medium", exams: ["denken3"] },
  { subject: "機械", topic: "電動機応用", priority: "low", exams: ["denken3"] },

  // ============ 法規 ============
  { subject: "法規", topic: "電気事業法（主任技術者）", priority: "high", exams: ["denken3"] },
  { subject: "法規", topic: "電圧の区分", priority: "high", exams: ["denken3"] },
  { subject: "法規", topic: "最大使用電圧", priority: "high", exams: ["denken3"] },
  { subject: "法規", topic: "絶縁耐力試験電圧", priority: "high", exams: ["denken3"] },
  { subject: "法規", topic: "低圧電路の絶縁抵抗", priority: "high", exams: ["denken3"] },
  { subject: "法規", topic: "B種接地抵抗", priority: "high", exams: ["denken3"] },
  { subject: "法規", topic: "A種・C種・D種接地抵抗", priority: "medium", exams: ["denken3"] },
  { subject: "法規", topic: "風圧荷重", priority: "medium", exams: ["denken3"] },
  { subject: "法規", topic: "支線の張力", priority: "medium", exams: ["denken3"] },
  { subject: "法規", topic: "高圧受電設備", priority: "medium", exams: ["denken3"] },
  { subject: "法規", topic: "電力量と電気料金", priority: "low", exams: ["denken3"] },

  // ============ 電力・管理（二次） ============
  { subject: "電力管理", topic: "三相短絡容量", priority: "high", exams: ["denken2_secondary"] },
  {
    subject: "電力管理",
    topic: "対称座標法による故障計算",
    priority: "high",
    exams: ["denken2_secondary", "denken1_secondary"],
  },
  { subject: "電力管理", topic: "中性点接地と地絡", priority: "medium", exams: ["denken2_secondary"] },
  { subject: "電力管理", topic: "電力系統の安定度", priority: "medium", exams: ["denken2_secondary"] },
  { subject: "電力管理", topic: "調相設備", priority: "medium", exams: ["denken2_secondary"] },
  { subject: "電力管理", topic: "変電所の保護リレー", priority: "medium", exams: ["denken2_secondary"] },

  // ============ 機械・制御（二次） ============
  { subject: "機械制御", topic: "変圧器の電圧変動率", priority: "high", exams: ["denken2_secondary"] },
  { subject: "機械制御", topic: "誘導電動機の等価回路", priority: "high", exams: ["denken2_secondary"] },
  { subject: "機械制御", topic: "同期機の出力と安定度", priority: "medium", exams: ["denken2_secondary"] },
  { subject: "機械制御", topic: "自動制御の安定判別", priority: "high", exams: ["denken2_secondary"] },
  { subject: "機械制御", topic: "状態方程式", priority: "low", exams: ["denken2_secondary", "denken1_secondary"] },
];

export const SYLLABUS_SUBJECTS: Subject[] = [...new Set(SYLLABUS.map((e) => e.subject))];

export interface SubjectCoverage {
  subject: Subject;
  total: number;
  covered: number;
  ratio: number;
  coveredTopics: string[];
  uncovered: { topic: string; priority: Priority }[];
}

export interface CoverageReport {
  bySubject: SubjectCoverage[];
  total: number;
  covered: number;
  ratio: number;
}

/**
 * 与えられた「カバー済み topic 集合」（テンプレート topic ＋ data 問題 topic）から
 * 科目別の被覆率を計算する。
 */
export function computeCoverage(coveredTopics: Iterable<string>): CoverageReport {
  const coveredSet = new Set(coveredTopics);
  const bySubject: SubjectCoverage[] = SYLLABUS_SUBJECTS.map((subject) => {
    const entries = SYLLABUS.filter((e) => e.subject === subject);
    const coveredEntries = entries.filter((e) => coveredSet.has(e.topic));
    const uncovered = entries
      .filter((e) => !coveredSet.has(e.topic))
      .map((e) => ({ topic: e.topic, priority: e.priority }));
    return {
      subject,
      total: entries.length,
      covered: coveredEntries.length,
      ratio: entries.length === 0 ? 0 : coveredEntries.length / entries.length,
      coveredTopics: coveredEntries.map((e) => e.topic),
      uncovered,
    };
  });
  const total = SYLLABUS.length;
  const covered = bySubject.reduce((acc, s) => acc + s.covered, 0);
  return { bySubject, total, covered, ratio: total === 0 ? 0 : covered / total };
}
