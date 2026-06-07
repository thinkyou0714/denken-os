/**
 * math-speech.ts — ユニコード数式を読み上げ文字列へ決定論変換（A1）。
 * statement/choices/solution は √( ² ³ · × Ω μ ≈ 〔〕 等を含み、スクリーンリーダが
 * 誤読(²→squared 等)/無視する。視覚表示はそのまま、aria-label に読み下しを与えるための純関数。
 */
const RULES: ReadonlyArray<readonly [RegExp | string, string]> = [
  [/√\(/g, "ルート("],
  ["√", "ルート"],
  ["²", "の2乗"],
  ["³", "の3乗"],
  ["×", "かける"],
  ["·", "かける"],
  ["÷", "わる"],
  ["≈", "およそ"],
  ["≦", "以下"],
  ["≧", "以上"],
  ["Ω", "オーム"],
  ["μ", "マイクロ"],
  ["θ", "シータ"],
  ["φ", "ファイ"],
  ["ε", "イプシロン"],
  [/〔([^〕]+)〕/g, "、単位$1"],
  [/j(\d)/g, "プラスjの$1（虚数）"],
];

export function mathToSpeech(src: string): string {
  let s = src;
  for (const [pat, rep] of RULES) {
    s = typeof pat === "string" ? s.split(pat).join(rep) : s.replace(pat, rep);
  }
  return s;
}
