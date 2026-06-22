/**
 * calc-drill.ts — 電卓速算ドリル（calculator-speed timed drill）の純ロジック。
 *
 * 目的: 本番で電卓に頼りきると時間が溶ける。√3・√2・π・単位換算・百分率といった
 *   「頻出の概算・暗算」を時間目標つきで反復し、計算スピードと数感覚を鍛える。
 *
 * 方針:
 *   - 決定論的に問題を生成する（seed 固定。テスト・日替わり固定セットに使える）。
 *   - 各問は「設問テキスト・正解値・許容誤差・目標時間(ms)」を持つ。
 *   - 採点は相対誤差で判定する純関数（浮動小数の桁ブレに強い）。
 *   - DOM 非依存。
 */
import { seededRng } from "../../lib/shared/rng.js";

/** 速算ドリルの問題種別。 */
export type CalcDrillKind = "sqrt3" | "sqrt2" | "pi" | "percent" | "unit";

/** 速算ドリル1問。 */
export interface CalcDrillProblem {
  kind: CalcDrillKind;
  /** 設問テキスト（例: "√3 × 200 ≒ ?"）。 */
  prompt: string;
  /** 正解値（数値）。 */
  answer: number;
  /** 採点の許容相対誤差（例: 0.02 = ±2%）。概算なので緩めに取る。 */
  tolerance: number;
  /** 目標解答時間（ms）。これを目安に速度を測る。 */
  targetMs: number;
  /** 解説（任意・暗算のコツ）。 */
  hint?: string;
}

/** よく使う定数（暗記対象）。 */
const SQRT3 = Math.sqrt(3);
const SQRT2 = Math.sqrt(2);

/** 整数範囲の乱数（min..max 含む）。 */
function intIn(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** 配列から1つ選ぶ（空でない前提）。 */
function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

/** √3 × N の概算（三相の線間↔相、√3I など頻出）。 */
function genSqrt3(rng: () => number): CalcDrillProblem {
  const n = intIn(rng, 2, 20) * 10; // 20..200
  return {
    kind: "sqrt3",
    prompt: `√3 × ${n} ≒ ?`,
    answer: SQRT3 * n,
    tolerance: 0.02,
    targetMs: 8000,
    hint: "√3 ≒ 1.732。×1.7 で概算してから微調整。",
  };
}

/** √2 × N の概算（実効値↔最大値など）。 */
function genSqrt2(rng: () => number): CalcDrillProblem {
  const n = intIn(rng, 2, 20) * 10;
  return {
    kind: "sqrt2",
    prompt: `√2 × ${n} ≒ ?`,
    answer: SQRT2 * n,
    tolerance: 0.02,
    targetMs: 8000,
    hint: "√2 ≒ 1.414。×1.41 で概算。",
  };
}

/** π × N の概算（角速度 ω=2πf、円周など）。 */
function genPi(rng: () => number): CalcDrillProblem {
  const variants = [
    () => {
      const f = pick(rng, [50, 60]);
      return {
        prompt: `2π × ${f}（角速度 ω）≒ ?`,
        answer: 2 * Math.PI * f,
        hint: "ω=2πf。50Hz→約314、60Hz→約377（暗記推奨）。",
      };
    },
    () => {
      const n = intIn(rng, 2, 20) * 5;
      return { prompt: `π × ${n} ≒ ?`, answer: Math.PI * n, hint: "π ≒ 3.14。" };
    },
  ];
  const v = pick(rng, variants)();
  return { kind: "pi", prompt: v.prompt, answer: v.answer, tolerance: 0.02, targetMs: 9000, hint: v.hint };
}

/** 百分率（力率改善・効率・損失率など）。 */
function genPercent(rng: () => number): CalcDrillProblem {
  const base = intIn(rng, 2, 40) * 50; // 100..2000
  const pct = pick(rng, [80, 85, 90, 95, 5, 10, 15, 20]);
  return {
    kind: "percent",
    prompt: `${base} の ${pct}% ≒ ?`,
    answer: (base * pct) / 100,
    tolerance: 0.01,
    targetMs: 7000,
    hint: "1% 分を出して掛ける。10%・1% の分解が速い。",
  };
}

/** 単位換算（kW↔W、kV↔V、kVA↔VA など SI 接頭辞）。 */
function genUnit(rng: () => number): CalcDrillProblem {
  const conversions = [
    () => {
      const kw = intIn(rng, 1, 99) / 10; // 0.1..9.9 kW
      return { prompt: `${kw} kW は何 W ?`, answer: kw * 1000, hint: "k = ×1000。" };
    },
    () => {
      const w = intIn(rng, 1, 50) * 100; // 100..5000 W
      return { prompt: `${w} W は何 kW ?`, answer: w / 1000, hint: "÷1000。" };
    },
    () => {
      const kv = intIn(rng, 1, 66) / 10;
      return { prompt: `${kv} kV は何 V ?`, answer: kv * 1000, hint: "k = ×1000。" };
    },
  ];
  const c = pick(rng, conversions)();
  return { kind: "unit", prompt: c.prompt, answer: c.answer, tolerance: 0.001, targetMs: 6000, hint: c.hint };
}

const GENERATORS: Readonly<Record<CalcDrillKind, (rng: () => number) => CalcDrillProblem>> = {
  sqrt3: genSqrt3,
  sqrt2: genSqrt2,
  pi: genPi,
  percent: genPercent,
  unit: genUnit,
};

/** ドリルに含める種別（ラウンドロビンで均等に出す）。 */
export const CALC_DRILL_KINDS: readonly CalcDrillKind[] = ["sqrt3", "sqrt2", "pi", "percent", "unit"];

/**
 * 速算ドリルを count 問、seed 固定で生成する（決定論的）。
 * 種別は CALC_DRILL_KINDS をラウンドロビンしつつ、各問の数値は seed 由来でばらつく。
 *
 * @param count 生成する問題数（>=1）。
 * @param seed  seed（同じ seed なら同じセット）。
 */
export function buildCalcDrill(count: number, seed = 1): CalcDrillProblem[] {
  const n = Math.max(0, Math.floor(count));
  const rng = seededRng(seed);
  const out: CalcDrillProblem[] = [];
  for (let i = 0; i < n; i++) {
    const kind = CALC_DRILL_KINDS[i % CALC_DRILL_KINDS.length] as CalcDrillKind;
    out.push(GENERATORS[kind](rng));
  }
  return out;
}

/**
 * 解答を採点する。相対誤差（answer が 0 のときは絶対誤差）が tolerance 以内なら正解。
 *
 * @param problem 出題
 * @param input   学習者の入力（文字列。数値化できなければ不正解）。
 */
export function gradeCalcDrill(problem: CalcDrillProblem, input: string | number): boolean {
  const value = typeof input === "number" ? input : Number(String(input).trim().replace(/,/g, ""));
  if (!Number.isFinite(value)) return false;
  const target = problem.answer;
  if (target === 0) return Math.abs(value) <= problem.tolerance;
  const relErr = Math.abs(value - target) / Math.abs(target);
  return relErr <= problem.tolerance;
}

/** 速算ドリルの集計結果。 */
export interface CalcDrillResult {
  total: number;
  correct: number;
  /** 正答率(0..100, 整数)。 */
  accuracyPct: number;
  /** 目標時間内に正解できた問題数（速さ＋正確さ）。 */
  onTime: number;
}

/**
 * 1セッション分の結果を集計する。
 * @param problems 出題したセット
 * @param corrects 各問の正誤（出題順）
 * @param timesMs  各問の所要時間 ms（出題順。省略時は時間判定なし）
 */
export function summarizeCalcDrill(
  problems: readonly CalcDrillProblem[],
  corrects: readonly boolean[],
  timesMs?: readonly number[],
): CalcDrillResult {
  const total = problems.length;
  let correct = 0;
  let onTime = 0;
  problems.forEach((p, i) => {
    if (corrects[i]) {
      correct++;
      const t = timesMs?.[i];
      if (t !== undefined && t <= p.targetMs) onTime++;
    }
  });
  const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { total, correct, accuracyPct, onTime };
}
