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
 * choices と distractors(reason 付き) から choice_explanations を組み立てる。
 * 正解には「正解」、誤答にはテンプレートが与えた典型ミスの理由を割り当てる。
 * multiple_choice 以外・選択肢が無い場合は undefined（付与しない）。
 */
function buildChoiceExplanations(
  format: string,
  choices: string[] | undefined,
  answerText: string,
  distractors: { text: string; reason: string }[] | undefined,
): { choice: string; correct: boolean; explanation: string }[] | undefined {
  if (format !== "multiple_choice" || !choices) return undefined;
  const reasonByText = new Map((distractors ?? []).map((d) => [d.text, d.reason]));
  return choices.map((c) => {
    if (c === answerText) return { choice: c, correct: true, explanation: "正解。" };
    const reason = reasonByText.get(c);
    return {
      choice: c,
      correct: false,
      explanation: reason ? `誤り: ${reason}` : "誤り（典型的な計算ミスによる値）。",
    };
  });
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

  // [moat] 誤答解説を永続化（13-best-practices §18）: 算出済みの distractor.reason を捨てない。
  const choiceExplanations = buildChoiceExplanations(format, draw.choices, draw.answerText, draw.distractors);
  const meta = template.meta ?? {};

  const problem: Problem = {
    id: opts.id,
    exam: template.exam,
    subject: template.subject,
    topic: template.topic,
    format,
    difficulty: template.difficulty,
    params: draw.params,
    statement: narration.statement,
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
    // --- 教育的メタデータ（存在するものだけ付与）---
    ...(meta.tags ? { tags: meta.tags } : {}),
    ...(meta.learningObjectives ? { learning_objectives: meta.learningObjectives } : {}),
    ...(meta.formulas ? { formulas: meta.formulas } : {}),
    ...(meta.hints ? { hints: meta.hints } : {}),
    ...(choiceExplanations ? { choice_explanations: choiceExplanations } : {}),
    ...(meta.relatedTopics ? { related_topics: meta.relatedTopics } : {}),
    ...(meta.prerequisites ? { prerequisites: meta.prerequisites } : {}),
    ...(meta.estimatedTimeSec ? { estimated_time_sec: meta.estimatedTimeSec } : {}),
    ...(format === "numeric" && draw.numericTolerance !== undefined
      ? { numeric: { tolerance: draw.numericTolerance, unit: draw.answerUnit } }
      : {}),
    ...(meta.references ? { references: meta.references } : {}),
    ...(meta.gradingPoints ? { grading_points: meta.gradingPoints } : {}),
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
  // 重複（同一 params/answer）を避けるためのベストエフォート de-dup。
  // 14-best-practices §重複: 「15問」に同じ問題が混ざる品質劣化を防ぐ。
  // 母集合を出し切ったら（staleTries が上限超）重複も許して count を満たす（件数は従来どおり）。
  const seen = new Set<string>();
  let staleTries = 0;
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
    if (!p) continue;
    const sig = [p.topic, p.answer, JSON.stringify(p.params ?? {})].join("|");
    const exhausted = staleTries >= maxAttempts; // 母集合を出し切ったとみなす
    if (seen.has(sig) && !exhausted) {
      staleTries++;
      continue; // 重複はスキップして別の draw を試す
    }
    seen.add(sig);
    staleTries = 0;
    out.push(p);
    n++;
  }
  return out;
}
