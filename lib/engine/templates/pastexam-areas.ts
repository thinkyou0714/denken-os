/**
 * pastexam-areas.ts — 電験の「過去問20年分」を逐語引用なしで織り込むための
 * 出題分野（canonical area）タクソノミ。
 *
 * 目的（docs/automation/04-pastexam-ingest §1）:
 *   公表問題（電気技術者試験センター）の出題分野を科目ごとに正準化し、
 *   各テンプレートの `pastExam.area` をこの一覧に対応づける。
 *   これにより「20年スパンで頻出の分野を、現在テンプレでどれだけカバーできているか」を
 *   `lib/audit/pastexam-coverage.ts` が定量化できる（傾向分析・改題出題の重み付けの元データ）。
 *
 * 重要:
 *   - ここには問題文・数値の逐語コピーは一切含めない（著作権＝04 §1）。
 *   - `frequency` は公表問題の出題傾向に基づく区分（high=ほぼ毎年 / mid=数年おき / low=稀）。
 *   - 理論・法規は20年スパンの主要分野を網羅的に列挙する（本リポジトリの重点2科目）。
 *     電力・機械・二次（電力管理/機械制御）は代表分野を記載（順次拡充）。
 */
import type { Subject } from "../schema.js";

export interface CanonicalArea {
  /** 出題分野名（テンプレートの `pastExam.area` と一致させる）。 */
  area: string;
  /** 20年スパンでの出題頻度区分（high=ほぼ毎年 / mid=数年おき / low=稀）。 */
  frequency: "high" | "mid" | "low";
  /** 補足（任意）。 */
  note?: string;
}

/**
 * 20年スパンの基準窓（西暦）。coverage レポートのスパン表示に使う。
 * 「過去問20年分」の解釈をコード上で一意にする（today を含む直近20年）。
 */
export const PASTEXAM_WINDOW: readonly [number, number] = [2006, 2025];

/**
 * 科目 → 正準出題分野の一覧。
 * 理論・法規は網羅、その他は代表分野（カバレッジ計算は登録済み科目のみ対象）。
 */
export const PASTEXAM_AREAS: Partial<Record<Subject, CanonicalArea[]>> = {
  理論: [
    { area: "静電気", frequency: "high", note: "コンデンサ・電界・電位・クーロン力・誘電体" },
    { area: "直流回路", frequency: "high", note: "合成抵抗・分圧分流・キルヒホッフ・テブナン・ブリッジ" },
    { area: "電磁気", frequency: "high", note: "磁界・電磁力・電磁誘導・インダクタンス・磁気回路" },
    { area: "単相交流回路", frequency: "high", note: "RLC・力率・共振・複素インピーダンス・過渡" },
    { area: "三相交流回路", frequency: "high", note: "Y-Δ・三相電力・対称座標の入口" },
    { area: "電子理論", frequency: "mid", note: "半導体・ダイオード・トランジスタ・電子の運動" },
    { area: "電子回路", frequency: "mid", note: "増幅回路・オペアンプ・発振・整流" },
    { area: "電気計測", frequency: "mid", note: "指示計器・誤差・分流器/倍率器・測定法" },
  ],
  法規: [
    { area: "電気事業法・電気工作物", frequency: "high", note: "保安規程・主任技術者・事業用/一般用区分" },
    { area: "電気設備技術基準", frequency: "high", note: "用語の定義・電圧区分・通則" },
    { area: "接地工事", frequency: "high", note: "A/B/C/D種・接地抵抗値・B種の計算" },
    { area: "電線路・架空配電", frequency: "high", note: "たるみ・張力・支持物・離隔・高さ・支線" },
    { area: "絶縁・絶縁耐力", frequency: "high", note: "絶縁抵抗・絶縁耐力試験・漏えい電流" },
    { area: "風圧荷重・機械的強度", frequency: "mid", note: "甲乙丙種風圧・電線/支持物の強度" },
    { area: "低圧・引込・屋内配線", frequency: "mid", note: "対地電圧制限・幹線・分岐・施設方法" },
    {
      area: "電気計算（B問題）",
      frequency: "high",
      note: "需要率・力率改善・電圧降下・短絡電流の応用計算。電力/機械と共通（科目横断）で、法規科目テンプレ単独では薄くなりやすい領域",
    },
  ],
};

/** 指定科目の正準分野一覧を返す（未登録科目は空配列）。 */
export function areasForSubject(subject: Subject): CanonicalArea[] {
  return PASTEXAM_AREAS[subject] ?? [];
}

/** カバレッジ計算の対象科目（タクソノミを登録済みの科目）。 */
export function trackedSubjects(): Subject[] {
  return Object.keys(PASTEXAM_AREAS) as Subject[];
}
