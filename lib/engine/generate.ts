/**
 * generate.ts — 生成パイプライン（03-quality-pipeline の5ステップをコード化）。
 *
 * [1] 生成      テンプレートで params を振り、コードで正解を算出
 * [2] 数値検査  綺麗な値・一意・現実的か（テンプレートが draw を棄却）
 * [3] 自動検算  正解は純関数算出 ⇒ solver_checked=true
 * [4] 整合確認  narrate の解説の最終数値がコード正解と一致するか（不一致は破棄）
 * [5] 出典付与  original 主軸 / 改題は citation 必須
 */
import { defaultNarrator, type Narrator, toNarrationInput } from "./narrate.js";
import type { Problem, SourceType } from "./schema.js";
import type { Template } from "./templates/types.js";
import { narrationMatchesAnswer, validateProblem } from "./validate.js";

export interface GenerateOptions {
  count: number;
  source?: SourceType;
  citation?: string;
  narrator?: Narrator;
  rng?: () => number;
  /** 1問あたりの draw 再試行上限（汚い値の振り直し）。 */
  maxAttemptsPerProblem?: number;
  idPrefix?: string;
  startIndex?: number;
  /** confidence の足切り（これ未満は出題しない。既定0=無効）。 */
  minConfidence?: number;
}

function makeId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

/**
 * テンプレートから1問を生成して Problem を組み立てる。
 * 汚い draw・narrate 数値不整合は null を返す（呼び出し側で再試行/スキップ）。
 */
export async function generateOne(
  template: Template,
  opts: {
    id: string;
    source: SourceType;
    citation?: string;
    narrator: Narrator;
    rng: () => number;
    maxAttempts: number;
    minConfidence?: number;
  },
): Promise<Problem | null> {
  let draw = null as ReturnType<Template["generate"]>;
  for (let i = 0; i < opts.maxAttempts; i++) {
    draw = template.generate(opts.rng);
    if (draw) break;
  }
  if (!draw) return null;

  const narration = await opts.narrator.narrate(toNarrationInput(draw, template.topic, template.subject));

  // [4] 整合確認: 解説の最終数値がコード正解と一致しなければ破棄。
  if (!narrationMatchesAnswer(narration.solution, draw.answerText)) return null;

  const citation = opts.source === "original" ? "DENKEN-OS オリジナル問題" : opts.citation;
  if (opts.source !== "original" && !citation) return null; // 改題は citation 必須

  const confidence = 0.9;
  // confidence 足切り（怪しいものは出さない閾値, 03-quality-pipeline）。
  if (opts.minConfidence !== undefined && confidence < opts.minConfidence) return null;

  const format = draw.format ?? "multiple_choice";

  const problem: Problem = {
    id: opts.id,
    exam: template.exam,
    subject: template.subject,
    topic: template.topic,
    format,
    difficulty: template.difficulty,
    params: draw.params,
    statement: narration.statement,
    ...(draw.figure ? { figure: draw.figure } : {}),
    // numeric は選択肢なし。multiple_choice のみ choices を持つ。
    ...(format === "multiple_choice" ? { choices: draw.choices } : {}),
    answer: draw.answerText,
    solution: narration.solution,
    validation: {
      solver_checked: true, // [3] 純関数で算出した正解
      human_checked: false, // 自動生成段階では未了（人間の承認ゲート）
      clean_answer: true, // [2] テンプレートが綺麗な draw だけ通す
      physically_valid: draw.physicallyValid,
      confidence,
    },
    source: { type: opts.source, citation },
    stats: { answered: 0, correct_rate: 0, common_wrong_choice: draw.likelyWrongChoice },
    status: "draft", // human_checked=false のため validated にはできない
  };

  // 仕上げに構造+不変条件を検証（answer∈choices 等）。落ちたら破棄。
  const result = validateProblem(problem);
  return result.ok ? problem : null;
}

/** count 件を生成する。汚い draw 等で歩留まりが落ちても可能な限り埋める。 */
export async function generate(template: Template, opts: GenerateOptions): Promise<Problem[]> {
  const narrator = opts.narrator ?? defaultNarrator();
  const rng = opts.rng ?? Math.random;
  const source = opts.source ?? "original";
  const maxAttempts = opts.maxAttemptsPerProblem ?? 50;
  const idPrefix = opts.idPrefix ?? "G";
  const start = opts.startIndex ?? 1;

  const out: Problem[] = [];
  let n = start;
  // 全体としても上限を設け、無限ループを防ぐ。
  const globalCap = opts.count * maxAttempts;
  for (let tries = 0; out.length < opts.count && tries < globalCap; tries++) {
    const p = await generateOne(template, {
      id: makeId(idPrefix, n),
      source,
      citation: opts.citation,
      narrator,
      rng,
      maxAttempts,
      minConfidence: opts.minConfidence,
    });
    if (p) {
      out.push(p);
      n++;
    }
  }
  return out;
}
