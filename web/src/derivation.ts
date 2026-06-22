/**
 * derivation.ts — 公式導出ドリル（derivation-ordering drill）の純ロジック。
 *
 * 目的: 記述・計算問題の「解答の筋道（solution steps）」を並べ替えさせることで、
 *   暗記ではなく「なぜその順で導くか」の手続き記憶を鍛える（テスト効果＋生成効果）。
 *
 * 方針:
 *   - 与えられた solution steps を seed 固定でシャッフルした「並べ替え問題」を作る。
 *   - 正解順は元の steps の順序そのもの（index 0..n-1）。
 *   - 並べ替え結果の正誤チェックは純関数で行い、DOM から分離してテスト可能にする。
 *   - ステップが3未満のときは並べ替えの意味が無いので「ドリル不成立(null)」を返す
 *     （1〜2手では順序の学びが生まれない）。
 *
 * DOM 非依存。seededRng を注入できるため決定論的にテストできる。
 */
import { seededRng } from "../../lib/shared/rng.js";

/** 並べ替えドリルが成立する最小ステップ数（これ未満は出題しない）。 */
export const MIN_DERIVATION_STEPS = 3;

/** 並べ替えドリルの1問。 */
export interface DerivationDrill {
  /** シャッフル済みの提示順（各要素は元 steps の index）。学習者にはこの順で見せる。 */
  shuffledOrder: number[];
  /** 正解順（元 steps の index 列。常に [0,1,2,...,n-1]）。 */
  correctOrder: number[];
  /** 元のステップ文字列（index でひける）。 */
  steps: string[];
}

/**
 * Fisher–Yates シャッフル（seed 固定）。exam.ts の内部実装と同等だが、
 * こちらは index 配列向けに独立させる（モジュール境界をまたがない）。
 */
function shuffleIndices(n: number, rng: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    // 0 <= j <= i < n のため両添字とも在中（cast は型上の明示のみ）。
    const tmp = a[i] as number;
    a[i] = a[j] as number;
    a[j] = tmp;
  }
  return a;
}

/**
 * solution steps から並べ替えドリルを1問作る。
 *
 * @param steps     解答ステップ（Problem.solution）。
 * @param seed      シャッフルの seed（同じ seed なら同じ提示順 → 決定論的）。
 * @returns ドリル。ステップが {@link MIN_DERIVATION_STEPS} 未満なら null（出題不成立）。
 */
export function buildDerivationDrill(steps: readonly string[], seed = 1): DerivationDrill | null {
  if (steps.length < MIN_DERIVATION_STEPS) return null;
  const n = steps.length;
  const correctOrder = Array.from({ length: n }, (_, i) => i);
  const rng = seededRng(seed);
  let shuffledOrder = shuffleIndices(n, rng);
  // 偶然そのまま正解順になってしまった場合は最初の2要素を入れ替えて「並べ替えがある」状態にする
  // （何も動かさず正解になるのは体験としておかしいため）。n>=3 なので index 0/1 は常に在中。
  if (shuffledOrder.every((v, i) => v === correctOrder[i])) {
    const swapped = [...shuffledOrder];
    const a = swapped[0] as number;
    swapped[0] = swapped[1] as number;
    swapped[1] = a;
    shuffledOrder = swapped;
  }
  return { shuffledOrder, correctOrder, steps: [...steps] };
}

/**
 * 学習者が並べた順（元 steps の index 列）が正解順かを判定する。
 * 長さ違い・要素欠落でも安全に false を返す。
 *
 * @param attempt      学習者の並べた index 列。
 * @param correctOrder 正解順（buildDerivationDrill の correctOrder）。
 */
export function isDerivationCorrect(attempt: readonly number[], correctOrder: readonly number[]): boolean {
  if (attempt.length !== correctOrder.length) return false;
  return attempt.every((v, i) => v === correctOrder[i]);
}

/**
 * 学習者の並べ替え結果のうち「正しい位置にあるステップ数」を返す（部分点・進捗表示用）。
 */
export function derivationScore(attempt: readonly number[], correctOrder: readonly number[]): number {
  let correct = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    if (attempt[i] === correctOrder[i]) correct++;
  }
  return correct;
}
