/**
 * rng.ts — 決定論的・seed 固定の擬似乱数生成器（xorshift 系）。
 *
 * 背景: scripts/build-problems.ts および複数のテストファイルに同一の xorshift 実装が
 * コピペされていた（根本原因 R3, I-033）。このファイルに一元化する。
 *
 * 【重要契約】
 * このファイルの `seededRng` は scripts/build-problems.ts の実装と
 * **ビット単位で完全に同一の出力**を生成しなければならない。
 * G5 が scripts 側を本 export に置き換えるため、出力が変わると
 * web/problems.json の生成物が変化し既存ユーザーの解答ログが壊れる。
 * アルゴリズムを変更する場合は必ず scripts/build-problems.ts も同時に更新し、
 * web/problems.json を再生成して差分がないことを確認すること。
 *
 * アルゴリズム: 内部カウンタ ＋ MurmurHash3 finalizer 風のビット混合（xorshift 系）。
 * 移植元の実装:
 *   let s = seed >>> 0;
 *   return () => {
 *     s |= 0;
 *     s = (s + 0x6d2b79f5) | 0;
 *     let t = Math.imul(s ^ (s >>> 15), 1 | s);
 *     t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
 *     return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 *   };
 */

/**
 * seed を固定した擬似乱数生成器を返す。
 *
 * 返り値の関数を呼ぶたびに [0, 1) の浮動小数点数を生成する。
 * 同じ seed を与えれば必ず同じ数列を生成する（決定論的）。
 *
 * @param seed - 初期 seed（32bit 符号なし整数として扱われる）
 * @returns () => number — [0, 1) の値を返す呼び出し可能オブジェクト
 *
 * @example
 * const rng = seededRng(42);
 * rng(); // 0.xxxxxx（固定値）
 * rng(); // 0.yyyyyy（固定値）
 */
export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 文字列から 32bit 符号なし整数の seed を作る（FNV-1a ハッシュ）。
 *
 * topic 名などの安定文字列から決定論的な seed を得るために使う。
 * 【重要契約】scripts/build-problems.ts の移植元実装とビット単位で同一であること
 * （変更すると生成 problems.json の ID・数列が変わる）。
 *
 * @param text - seed の元になる文字列
 * @returns 32bit 符号なし整数
 */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
