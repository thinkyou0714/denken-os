/**
 * validate.ts — 問題データの検証。
 *
 * 二段構え (problem-schema.json の $comment / 09-ci-quality-gate.md の役割分担):
 *  1) 構造検証: zod (problem-schema.json のミラー)
 *  2) コード側不変条件: draft-07 で表現できない「answer ∈ choices」等
 *
 * ε: ANSWER_EPSILON は clean.ts が提供する定数（G1 との契約）。
 * G1 完了前にこのファイルを参照する場合は型エラーになりうるが、
 * wave 終了時にオーケストレータが統合検証する。
 *
 * ## validateProblemSet（II-115）
 * `validateProblemSet(problems)` で問題セット全体の酷似パラメータ（実質重複）を検出する。
 * 純関数・既存 generate には組み込まず、提供のみ。
 */
import { ANSWER_EPSILON, formatClean, isCleanAnswer } from "./clean.js";
import { type Problem, problemSchema } from "./schema.js";

export interface ValidationIssue {
  rule: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  problem?: Problem;
}

/** multiple_choice のとき answer が choices のいずれかと一致するか。 */
export function answerInChoices(p: Problem): boolean {
  if (p.format !== "multiple_choice") return true;
  if (!p.choices) return false;
  return p.choices.includes(p.answer);
}

/** answer が「綺麗な値」か（数値として解釈できるとき）。非数値（記述式等）は true。 */
export function answerIsClean(p: Problem): boolean {
  const n = Number(p.answer);
  if (Number.isNaN(n)) return true;
  return isCleanAnswer(n);
}

/**
 * コード側不変条件（draft-07 で表現できない「answer ∈ choices」「clean_answer 整合」）を
 * 1 箇所に集約する純関数。validateProblem（zod 経路）と scripts/validate-problems.ts
 * （ajv/CI 経路）の両方から呼び、二経路が同じ不変条件を強制することを保証する（PAR-01）。
 */
export function checkProblemInvariants(p: Problem): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!answerInChoices(p)) {
    issues.push({
      rule: "answer_in_choices",
      message: `answer "${p.answer}" が choices に含まれていません`,
    });
  }

  if (p.validation.clean_answer && !answerIsClean(p)) {
    issues.push({
      rule: "clean_answer",
      message: `clean_answer=true だが answer "${p.answer}" は綺麗な値ではありません`,
    });
  }

  return issues;
}

/**
 * 1件を完全検証する。構造(zod) → コード側不変条件 の順に積み上げる。
 */
export function validateProblem(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  const parsed = problemSchema.safeParse(input);
  if (!parsed.success) {
    for (const e of parsed.error.issues) {
      issues.push({ rule: "schema", message: `${e.path.join(".")}: ${e.message}` });
    }
    return { ok: false, issues };
  }

  const p = parsed.data;
  issues.push(...checkProblemInvariants(p));

  return { ok: issues.length === 0, issues, problem: p };
}

/**
 * 問題セット全体の酷似パラメータ（実質重複）を検出する（II-115）。
 *
 * 同一 topic 内で全数値パラメータが `PARAM_SIMILARITY_THRESHOLD` 以内に収まる問題を
 * 「酷似」とみなし、`ValidationIssue` として報告する。純関数。
 * 既存の generate には組み込まず、セット全体のポストバリデーションとして提供する。
 *
 * @param problems - 検査対象の問題セット（validateProblem を通過した Problem[]）
 * @param threshold - 各パラメータ値の相対誤差許容範囲（既定: 1e-6 = 実質同一）
 * @returns 酷似ペアごとの ValidationIssue リスト（空 = 問題なし）
 *
 * 使用例:
 * ```ts
 * const issues = validateProblemSet(problems);
 * if (issues.length > 0) console.warn("重複問題検出:", issues);
 * ```
 */
export const PARAM_SIMILARITY_THRESHOLD = 1e-6;

export function validateProblemSet(problems: Problem[], threshold = PARAM_SIMILARITY_THRESHOLD): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // topic ごとにグループ化
  const byTopic = new Map<string, Problem[]>();
  for (const p of problems) {
    const group = byTopic.get(p.topic) ?? [];
    group.push(p);
    byTopic.set(p.topic, group);
  }

  for (const [topic, group] of byTopic) {
    // 数値パラメータを持つ問題のみ比較（filter で params の存在は確認済み）
    const withParams = group.filter((p) => p.params && Object.keys(p.params).length > 0);
    for (let i = 0; i < withParams.length - 1; i++) {
      const a = withParams[i];
      if (!a) continue;
      for (let j = i + 1; j < withParams.length; j++) {
        const b = withParams[j];
        if (!b) continue;
        // filter で params 存在を確認済みだが、型システム上 undefined 可能なため空オブジェクトにフォールバック
        const aParams = a.params ?? {};
        const bParams = b.params ?? {};
        if (areSimilarParams(aParams, bParams, threshold)) {
          issues.push({
            rule: "duplicate_params",
            message: `topic="${topic}" 内で問題 ${a.id} と ${b.id} のパラメータが酷似しています（相対誤差 ≤ ${threshold}）`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * 2問のパラメータが「酷似」しているか判定する（validateProblemSet のヘルパー）。
 * キーセットが同一で、全値の相対誤差が threshold 以内のとき true。
 */
function areSimilarParams(
  a: NonNullable<Problem["params"]>,
  b: NonNullable<Problem["params"]>,
  threshold: number,
): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  if (keysA.some((k, i) => k !== keysB[i])) return false;

  for (const key of keysA) {
    const va = a[key]?.value;
    const vb = b[key]?.value;
    if (va === undefined || vb === undefined) return false;
    // ゼロ同士はそのまま同一とみなす。それ以外は相対誤差。
    const denom = Math.max(Math.abs(va), Math.abs(vb), Number.EPSILON);
    if (Math.abs(va - vb) / denom > threshold) return false;
  }
  return true;
}

/**
 * 解説テキストから「最終的な答え」を取り出し、想定値と一致するか確認する。
 * narrate.ts が出した解説の数値整合チェック（不一致なら generate 側で破棄）。
 *
 * 数値抽出正規表現:
 *  - 指数表記 (1.5e3, 2E-4) に対応（I-013 拡張）。
 *  - 符号付き数値 (-5.0, +3) にも対応。
 *  - 既存の受理挙動は維持し、受理範囲を広げる方向の拡張のみ行う。
 *
 * 受理が広がった例:
 *  - "電流 I=1.5e3A" → 1500 として answerText="1500" と照合できるようになった。
 *  - "+3.2" のように符号付き数値も数値として抽出できるようになった。
 *  - "2.56E-4" の大文字 E 指数表記も受理。
 */
/** 上付き指数（×10⁻³ など）を e 表記へ正規化する写像。 */
const SUPERSCRIPT: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
  "⁺": "+",
};

/**
 * 科学表記の正規化（I-013 拡張 / engine#4）。
 * `a×10ⁿ` `a·10^n` `a*10-3` を `aen` に畳み込む。
 * 効果:
 *  - `9×10⁹`（クーロン定数）を 9000000000 として1トークンに集約し、
 *    末尾の係数 `9` が答え `9` に誤マッチする偽陽性を防ぐ。
 *  - `1×10⁻³` のような指数表記の最終値も照合できるようにする。
 */
function normalizeSci(s: string): string {
  return s.replace(/[×·*]\s*10\s*\^?\s*([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+|[+-]?\d+)/g, (_m, exp: string) => {
    const ascii = [...exp].map((c) => SUPERSCRIPT[c] ?? c).join("");
    return `e${ascii}`;
  });
}

/** 補足・別解など「結論ではない」解説ステップの接頭辞。 */
const ASIDE_STEP = /^[（(]?\s*(別解|別法|ポイント|補足|注意|注[:：]|ヒント|参考|検算|確認|なお|ちなみに)/;

function isAsideStep(step: string): boolean {
  const t = step.trim();
  // 括弧で始まるステップ（「（t=T で63.2%…）」等の補足注記）は結論ではない。
  return t.startsWith("（") || t.startsWith("(") || ASIDE_STEP.test(t);
}

/** 解説の中で「結論」とみなすステップ（末尾から見て最初の非・補足ステップ）。 */
export function conclusionStep(solution: readonly string[]): string {
  for (let i = solution.length - 1; i >= 0; i--) {
    const s = solution[i];
    if (s !== undefined && !isAsideStep(s)) return s;
  }
  return solution[solution.length - 1] ?? "";
}

/**
 * 解説の「最終的な答え」が想定値と一致するか確認する（narrate の整合チェック）。
 *
 * engine#2 是正: 旧実装は解説**全体**から数値を抽出し1つでも近ければ通過したため、
 * LLM が**最終結論だけ**を誤った値に書き換えても、入力値や係数が前段に残っていれば
 * すり抜ける偽陽性があった。本実装は**結論ステップ**（末尾の非・補足ステップ）に
 * 想定値が現れることを要求する。決定論スタブの defaultSolution は結論ステップに
 * 答えを置く規約のため挙動は不変。
 *
 * 数値抽出:
 *  - 指数表記 (1.5e3, 2E-4) ＋ 上付き指数 (×10⁻³) に対応（normalizeSci）。
 *  - 符号付き数値 (-5.0, +3) にも対応。
 */
export function narrationMatchesAnswer(solution: string[], answerText: string): boolean {
  if (solution.length === 0) return false;
  const conclusion = conclusionStep(solution);
  const expected = Number(answerText);
  if (Number.isNaN(expected)) {
    // 非数値の答え（センチネル等）は結論ステップに answerText が現れることを要求。
    return conclusion.includes(answerText);
  }
  // 係数衝突ガード: 結論ステップは「式 = 最終値」の形が多く、式側の係数
  // （例: P=3·I²·R の 3、v=2I(...) の 2）が正解と数値一致すると、最終値が
  // 改変されていても照合が通ってしまう。最後の「=」/「≈」より後ろ（= 最終値side）
  // だけを照合対象にする。等号が無い結論（「よって約3.2kWとなる」等）は従来どおり
  // 全体を照合する（式係数を含まないため衝突リスクが低い）。
  const normalized = normalizeSci(conclusion);
  const lastEq = Math.max(normalized.lastIndexOf("="), normalized.lastIndexOf("≈"));
  const segment = lastEq >= 0 ? normalized.slice(lastEq + 1) : normalized;
  const nums = segment.match(/[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g)?.map(Number) ?? [];
  const tol = Math.max(ANSWER_EPSILON, Math.abs(expected) * ANSWER_EPSILON);
  return nums.some((n) => Math.abs(n - expected) <= tol);
}

/**
 * 問題文がパラメータの数値を保持しているか（engine#1）。
 *
 * narrate（LLM リライト）が問題文中の入力値を改変すると、**問題文と正解が乖離**した
 * 内部矛盾問題が生まれる（解説・正解は別途検証されるが問題文は未検証だった）。
 * 各パラメータ値の整形済み文字列が問題文に現れることを要求し、欠けていれば
 * 呼び出し側は決定論の defaultStatement にフォールバックする（問題は失わない）。
 */
export function statementMatchesParams(statement: string, paramValues: readonly number[]): boolean {
  // 部分文字列ではなく数値トークン境界で照合する。substring 判定だと「2」が「200」や
  // 「3300」の内部にヒットし、LLM が値を改変した問題文でも元の桁が別の数値の一部として
  // 残っていれば通過してしまう（engine#1 ガードの実効性が失われる）。
  return paramValues.every((v) => {
    const escaped = formatClean(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![\\d.])${escaped}(?![\\d.])`).test(statement);
  });
}
