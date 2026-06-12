/**
 * tests/helpers/rng.ts — テスト用 seededRng の薄い re-export（I-064）。
 *
 * lib/shared/rng.ts（G3 で新設）を re-export するだけのラッパ。
 * 既存テストが持つ seededRng のインライン定義を置き換え、
 * seed 値・期待値・アルゴリズムは lib/shared/rng.ts と完全に同一。
 */
export { hashSeed, seededRng } from "../../lib/shared/rng.js";
