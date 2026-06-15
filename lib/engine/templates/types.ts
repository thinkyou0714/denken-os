/**
 * パラメトリック・テンプレートの共通インターフェース。
 *
 * 設計の核心（docs/automation/01-problem-engine.md §1）:
 *   「数値の正解は LLM に出させない。コードで計算する。」
 * テンプレートは決定論的な純関数として、係数(params) から
 *   { 正解, 各量, 誤答選択肢, 制約 }
 * を返す。LLM は narrate.ts で「言い回し」だけを担当する。
 */
import type { Exam, ProblemFormat, Subject } from "../schema.js";

export interface ParamSpec {
  unit?: string;
  /** 係数を振る現実的レンジ [min, max]（03-quality-pipeline の数値レンジルール）。 */
  realistic_range: [number, number];
  /**
   * このパラメータが generateFrom の入力として必須かどうか（II-110）。
   * 省略時は必須扱い（既定 true）。
   * false を指定した省略可能パラメータは、generateFrom で欠落していても null を返さない。
   * （defineTemplate の paramOrder によるキー存在チェックと整合する）
   */
  required?: boolean;
}

export interface ParamValue {
  value: number;
  unit?: string;
  realistic_range?: [number, number];
}

export interface Distractor {
  /** 整形済みの誤答テキスト。 */
  text: string;
  /** どんな典型ミスに対応するか（解答編の解説に使う）。必須（II-109）。 */
  reason: string;
  /**
   * この誤答が選ばれる相対的な頻度の推定値（II-109）。
   * 未指定時は均一として扱う。将来の統計収集で活用するための予約フィールド。
   */
  frequency?: number;
  /**
   * この誤答パターンの典拠・参照先（II-123）。
   * 例: "H28-問4" (過去問) / "教科書 p.123" など。
   */
  sourceRef?: string;
}

export interface GenerationResult {
  /** 出題形式（既定: multiple_choice）。numeric は選択肢なし。 */
  format?: ProblemFormat;
  params: Record<string, ParamValue>;
  /** コードが算出した数値の真値（検算の基準）。 */
  answerValue: number;
  answerUnit: string;
  /**
   * 整形済みの正解テキスト（multiple_choice では choices のいずれかと一致することを保証）。
   * answerText は String(Number(x.toFixed(2))) または formatClean(x) で生成する。
   */
  answerText: string;
  /** 正解を含む選択肢（昇順）。numeric/descriptive では省略。 */
  choices?: string[];
  distractors?: Distractor[];
  /** 最頻誤答になりやすい選択肢テキスト（stats.common_wrong_choice の既定値）。 */
  likelyWrongChoice?: string;
  /** narrate.ts が言い回しに使う事実（数値）。 */
  facts: Record<string, number | string>;
  /** LLM 不在でも成立する既定の問題文。 */
  defaultStatement: string;
  /** LLM 不在でも成立する既定の解法ステップ。 */
  defaultSolution: string[];
  /** 図（インライン SVG 文字列・任意）。回路図/ベクトル図などを problem.figure に載せる。 */
  figure?: string;
  /** 物理的に成立するか（力率<=1 等）。 */
  physicallyValid: boolean;
}

export interface Template {
  topic: string;
  subject: Subject;
  exam: Exam;
  difficulty: number;
  paramSpecs: Record<string, ParamSpec>;
  /**
   * rng(0..1) で係数を振り、コードで正解を算出する。
   * 「答えが綺麗にならない」「物理的に不成立」な draw は null を返す（呼び出し側で振り直し）。
   */
  generate(rng: () => number): GenerationResult | null;
  /**
   * 固定 params から決定論的に生成する（サンプル再現・テスト用）。
   * 綺麗でない/不成立なら null。
   */
  generateFrom(params: Record<string, number>): GenerationResult | null;
}
