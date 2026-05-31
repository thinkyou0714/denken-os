/**
 * 「綺麗な値」判定（03-quality-pipeline.md「数値レンジのルール」）。
 * 答えが整数 or 小さい分母の有理数（=2桁の小数で割り切れる）かどうか。
 * 汚い答え（無限小数・端数）は出題しない。
 */
const EPS = 1e-6;

/** value が小数点以下 maxDecimals 桁ちょうどで表せる（割り切れる）か。 */
export function isCleanAnswer(value: number, maxDecimals = 2): boolean {
  if (!Number.isFinite(value)) return false;
  const scale = 10 ** maxDecimals;
  const scaled = value * scale;
  return Math.abs(scaled - Math.round(scaled)) < EPS;
}

/**
 * 電力(W) を kW 表記の文字列に整形する。
 * 例: 3200 -> "3.2" / 2560 -> "2.56" / 4000 -> "4.0" / 9600 -> "9.6"
 * （problem-sample.md T-0001 の選択肢表記に一致させる）
 */
export function formatKW(watts: number): string {
  const kw = watts / 1000;
  let s = kw.toFixed(2); // "4.00" / "3.20" / "2.56" / "9.60"
  if (s.endsWith("0")) s = s.slice(0, -1); // "4.0" / "3.2" / "2.56" / "9.6"
  return s;
}

/**
 * 綺麗な数値を最短の小数表記に整形する（末尾0と小数点を落とす）。
 * 例: 75 -> "75" / 4.60 -> "4.6" / 2.56 -> "2.56" / 0.90 -> "0.9"
 * 整数なら整数、小数なら最大 maxDecimals 桁で四捨五入後にトリム。
 */
export function formatClean(value: number, maxDecimals = 2): string {
  let s = value.toFixed(maxDecimals);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}
