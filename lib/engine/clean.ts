/**
 * 「綺麗な値」判定（03-quality-pipeline.md「数値レンジのルール」）。
 * 答えが整数 or 小さい分母の有理数（=2桁の小数で割り切れる）かどうか。
 * 汚い答え（無限小数・端数）は出題しない。
 *
 * ## formatClean と formatKW の使い分け（II-106）
 *
 * | 関数         | 用途                                      | 末尾ゼロ      | 例                      |
 * |------------|------------------------------------------|------------|------------------------|
 * | formatClean | numeric/descriptive 形式の answerText、解説中数値 | 落とす       | 50→"50" / 4.0→"4"      |
 * | formatKW    | kW 単位の multiple_choice 選択肢テキスト         | 1桁は残す    | 4000W→"4.0" / 3200W→"3.2" |
 *
 * 選択肢生成では formatKW または formatClean を **混用しない**こと。
 * 同一テンプレート内で正解と誤答の整形関数を統一する（桁数の差が重複排除を妨げる）。
 *
 * ### ゼロ割・NaN の扱い（II-104）
 *
 * `percentage()` 等のヘルパーは分母 0 のとき NaN を返す（例外ではなく NaN）。
 * 呼び出し側は `Number.isNaN(result)` でチェックし、NaN なら `return null` で棄却すること。
 *
 * @example
 * const eta = percentage(output, input);
 * if (Number.isNaN(eta) || eta <= 0) return null;
 */

/**
 * 数値安定化の閾値（I-007）。
 * isCleanAnswer の内部判定、およびテンプレートで直接使う場合はこの定数を import する
 * （ハードコードの重複を防ぐ: capacitor-energy, sag-tension が利用）。
 * G2 の validate.ts が同定数を参照するために export している。
 */
export const ANSWER_EPSILON = 1e-6;

const EPS = ANSWER_EPSILON;

/**
 * value が小数点以下 maxDecimals 桁ちょうどで表せる（割り切れる）か。
 * テンプレートの「綺麗な値チェック」で使う。多くのテンプレートが
 * `if (!isCleanAnswer(x)) return null;` のパターンで不成立の draw を棄却する。
 */
export function isCleanAnswer(value: number, maxDecimals = 2): boolean {
  if (!Number.isFinite(value)) return false;
  const scale = 10 ** maxDecimals;
  const scaled = value * scale;
  return Math.abs(scaled - Math.round(scaled)) < EPS;
}

/**
 * 電力(W) を kW 表記の文字列に整形する。
 * 用途: multiple_choice の選択肢テキスト（T-0001 の kW 単位の表記規則に合わせる）。
 * 末尾が "00" なら1桁だけ落とす（"4.0"→OK, "4"→NG、選択肢の桁数を揃えるため）。
 * 例: 3200 -> "3.2" / 2560 -> "2.56" / 4000 -> "4.0" / 9600 -> "9.6"
 * （problem-sample.md T-0001 の選択肢表記に一致させる）
 * ※ numeric / descriptive 形式の答えには formatClean を使う。
 */
export function formatKW(watts: number): string {
  const kw = watts / 1000;
  let s = kw.toFixed(2); // "4.00" / "3.20" / "2.56" / "9.60"
  if (s.endsWith("0")) s = s.slice(0, -1); // "4.0" / "3.2" / "2.56" / "9.6"
  return s;
}

/**
 * 「綺麗な値」を末尾ゼロを落とした最短表記の文字列にする（numeric/descriptive 用）。
 * 用途: numeric・descriptive 形式の answerText、および解説ステップ中の数値表記。
 * 例: 50 -> "50" / 9.5 -> "9.5" / 10.35 -> "10.35" / 1.0 -> "1"
 * 表記揺れを避けるため、答え・選択肢・解説の数値はこの関数で統一する。
 * ※ kW 単位で "4.0" のように末尾ゼロを残したい場合は formatKW を使う。
 */
export function formatClean(value: number, maxDecimals = 2): string {
  return String(Number(value.toFixed(maxDecimals)));
}
