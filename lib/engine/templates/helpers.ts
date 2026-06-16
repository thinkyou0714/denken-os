/**
 * テンプレート共有ヘルパー層（I-001〜I-004, I-009, I-010, II-102〜II-105）。
 *
 * 新規テンプレートはこの形を標準とする:
 *   1. pick / buildChoices / percentage / ensureRange / constrainRange / isNonNegative などのヘルパーを import する。
 *   2. 必要に応じて defineTemplate() ファクトリを使って Template を組み立てる。
 *   3. ローカルで pick() を重複定義しない。
 */
import type { ParamSpec, PastExamCoverage, Template } from "./types.js";

// POWER_FACTOR_TOLERANCE を re-export して、テンプレートが1か所から参照できるようにする（II-103）。
export { POWER_FACTOR_TOLERANCE } from "../../shared/constants.js";

// ---------------------------------------------------------------------------
// I-001 / I-002: pick
// ---------------------------------------------------------------------------

/**
 * 配列からランダムに1要素を返す。
 * 空配列が渡された場合は明示的に Error を throw する（I-002）。
 */
export function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  if (arr.length === 0) throw new Error("pick: empty array");
  // arr.length > 0 を上で保証済みのため index は必ず範囲内。
  return arr[Math.floor(rng() * arr.length)] as T;
}

// ---------------------------------------------------------------------------
// I-003: buildChoices
// ---------------------------------------------------------------------------

/**
 * 正解テキストと誤答テキスト群から選択肢配列を組み立てる。
 *   - 重複を排除する。
 *   - 正解が含まれることを保証する。
 *   - 数値として解釈できる要素は数値昇順、できない要素は辞書順（混在時は数値を前に置く）。
 *
 * ※既存テンプレートがすでに独自の sort ロジックを持つ場合は、
 *   ロジックが完全一致するテンプレートのみへ適用する。
 */
export function buildChoices(correctText: string, distractorTexts: string[]): string[] {
  const all = [correctText, ...distractorTexts];
  const unique = [...new Set(all)];
  return unique.sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const aIsNum = Number.isFinite(na);
    const bIsNum = Number.isFinite(nb);
    if (aIsNum && bIsNum) return na - nb;
    if (aIsNum) return -1;
    if (bIsNum) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

// ---------------------------------------------------------------------------
// I-004: percentage
// ---------------------------------------------------------------------------

/**
 * 分率（numerator / denominator × 100）を返す。
 * denominator が 0 の場合は NaN を返す（呼び出し側で物理的成立判定を行うこと）。
 */
export function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return Number.NaN;
  return (numerator / denominator) * 100;
}

// ---------------------------------------------------------------------------
// I-010: ensureRange
// ---------------------------------------------------------------------------

/**
 * value が [min, max] の閉区間に収まるかを返す。
 * テンプレートの物理的成立判定・paramSpecs のレンジ検証に使う。
 */
export function ensureRange(value: number, range: readonly [number, number]): boolean {
  const [min, max] = range;
  return value >= min && value <= max;
}

// ---------------------------------------------------------------------------
// II-102: constrainRange — 物理制約チェック共有ヘルパー
// ---------------------------------------------------------------------------

/**
 * value が [min, max] の閉区間に収まるかを返す（II-102）。
 * ensureRange と同等だが、物理制約チェック用途であることを名前で明示する。
 * 効率 η≤1、力率≤1 等の物理上限チェックをテンプレートごとに書かないための共有ヘルパー。
 *
 * @param value  チェックする値
 * @param min    最小値（境界を含む）
 * @param max    最大値（境界を含む）
 * @param _name  デバッグ用の量の名前（将来の診断ログ用; 現在は使用しない）
 * @returns value が [min, max] に収まれば true
 *
 * @example
 * // 効率 η≤1 の物理制約チェック
 * if (!constrainRange(eta, 0, 1)) return null;
 *
 * @example
 * // 力率 cosφ≤1 の物理制約チェック（許容誤差付きは POWER_FACTOR_TOLERANCE を別途使用）
 * if (!constrainRange(cosPhi, 0, 1 + POWER_FACTOR_TOLERANCE)) return null;
 */
export function constrainRange(value: number, min: number, max: number, _name?: string): boolean {
  return value >= min && value <= max;
}

// ---------------------------------------------------------------------------
// II-105: isNonNegative — 物理量の非負ガード
// ---------------------------------------------------------------------------

/**
 * 物理量の非負ガード（II-105）。
 * 丸め誤差等で負値化した計算結果を棄却するための共有ヘルパー。
 * return null のみの暗黙的なガードを共有化する。
 *
 * @param value  チェックする物理量
 * @returns 0以上（非負）なら true
 *
 * @example
 * const power = calcPower(I, R);
 * if (!isNonNegative(power)) return null; // 丸め誤差で負値になった場合を棄却
 */
export function isNonNegative(value: number): boolean {
  return value >= 0;
}

// ---------------------------------------------------------------------------
// II-104: percentage のゼロ割 NaN についての注記は helpers.ts の percentage を参照
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// I-009: defineTemplate ファクトリ
// ---------------------------------------------------------------------------

/**
 * defineTemplate が受け取る設定オブジェクトの型。
 * `draw(rng)` でパラメータを抽選し、`buildFrom(params)` で GenerationResult を組み立てる。
 * テンプレートの generate / generateFrom 委譲はファクトリが行う。
 */
export interface TemplateSpec<P extends Record<string, number>> {
  topic: string;
  subject: Template["subject"];
  exam: Template["exam"];
  difficulty: number;
  /** 過去問の出題傾向メタ（任意）。20年分のカバレッジ可視化・傾向分析に使う。 */
  pastExam?: PastExamCoverage;
  paramSpecs: Record<keyof P & string, ParamSpec>;
  /** パラメータ名の順序（generateFrom のキー存在確認に使う）。 */
  paramOrder: (keyof P & string)[];
  /** rng を受け取ってパラメータを抽選して返す。 */
  draw(rng: () => number): P;
  /** 固定パラメータから決定論的に GenerationResult を組み立てる。不成立なら null。 */
  buildFrom(params: P): import("./types.js").GenerationResult | null;
}

/**
 * TemplateSpec から Template を組み立てるファクトリ（I-009）。
 * generate / generateFrom の委譲パターンを一元化する。
 *
 * 新規テンプレートはこの形を標準とする。
 */
export function defineTemplate<P extends Record<string, number>>(spec: TemplateSpec<P>): Template {
  return {
    topic: spec.topic,
    subject: spec.subject,
    exam: spec.exam,
    difficulty: spec.difficulty,
    // exactOptionalPropertyTypes: 未指定時はキー自体を省く（undefined を代入しない）。
    ...(spec.pastExam ? { pastExam: spec.pastExam } : {}),
    paramSpecs: spec.paramSpecs as Record<string, ParamSpec>,
    generate(rng) {
      return spec.buildFrom(spec.draw(rng));
    },
    generateFrom(rawParams) {
      // paramOrder に列挙されたすべてのキーが存在するかを確認する。
      for (const key of spec.paramOrder) {
        if (rawParams[key] === undefined) return null;
      }
      // 直前の for-of ループで全キーの存在を確認済み。undefined でないことが保証される。
      const params = Object.fromEntries(spec.paramOrder.map((k) => [k, rawParams[k] as number])) as P;
      return spec.buildFrom(params);
    },
  };
}
