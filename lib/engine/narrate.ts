/**
 * narrate.ts — 問題文と解説の「言い回し」だけを担当する LLM レイヤ。
 *
 * 設計の核心 (docs/automation/01-problem-engine.md §1):
 *   数値の正解はコード(テンプレート)が算出する。LLM は statement/solution の
 *   文章化だけを行い、**数値は一切変更してはならない**。
 *   生成後、解説中の最終数値がコードの正解と一致するかを generate.ts が検証する
 *   (不一致なら破棄)。
 *
 * Narrator はインターフェース化してあり、既定は API 不要の決定論スタブ。
 * ANTHROPIC_API_KEY があるときだけ AnthropicNarrator を使う。
 */
import type { GenerationResult } from "./templates/types.js";

export interface NarrationInput {
  topic: string;
  subject: string;
  answerText: string;
  answerUnit: string;
  facts: Record<string, number | string>;
  defaultStatement: string;
  defaultSolution: string[];
}

export interface Narration {
  statement: string;
  solution: string[];
}

export interface Narrator {
  narrate(input: NarrationInput): Promise<Narration>;
}

export function toNarrationInput(g: GenerationResult, topic: string, subject: string): NarrationInput {
  return {
    topic,
    subject,
    answerText: g.answerText,
    answerUnit: g.answerUnit,
    facts: g.facts,
    defaultStatement: g.defaultStatement,
    defaultSolution: g.defaultSolution,
  };
}

/**
 * 既定の Narrator。LLM を呼ばず、テンプレートの既定文をそのまま返す。
 * 決定論的なのでテスト・CI・オフライン生成で使える。数値は当然一致する。
 */
export class StubNarrator implements Narrator {
  async narrate(input: NarrationInput): Promise<Narration> {
    return { statement: input.defaultStatement, solution: input.defaultSolution };
  }
}

/**
 * テスト用: わざと数値を壊す Narrator。
 * 「解説の最終値とコード正解の不一致を検出して破棄する」負テストに使う。
 */
export class CorruptingNarrator implements Narrator {
  async narrate(input: NarrationInput): Promise<Narration> {
    return {
      statement: input.defaultStatement,
      // 解説の最終値をコード正解と無関係な値に差し替える（ハルシネーション相当）。
      solution: ["（途中式省略）", "P=999999kW（誤った最終値）"],
    };
  }
}

const NARRATION_SYSTEM = `あなたは電験(電気主任技術者試験)の問題文・解説のリライタです。
与えられた既定の問題文と解法ステップを、より自然で読みやすい日本語に言い換えます。

絶対的な制約:
- 数値・単位・記号を一切変更しない（係数・正解・途中式の値は固定）。
- 新しい数値や事実を加えない。物理的な関係を変えない。
- 解法ステップの最終的な答えの値は、与えられた answerText と必ず一致させる。
- 出典・著作権に触れない。誇張しない。

出力は statement(問題文1つ) と solution(解法ステップの配列) のみ。`;

/**
 * Claude API で言い回しを生成する Narrator。
 * - 数値を変えない指示を system に固定し、prompt caching を効かせる。
 * - 構造化出力(messages.parse + zodOutputFormat)で {statement, solution} を強制。
 * - フレーズ整形のみの軽量タスクのため既定モデルは Haiku（DENKEN_NARRATE_MODEL で上書き可）。
 *   生成数値の正しさはコード側の検算で担保するので、ここは安価モデルで十分。
 */
export class AnthropicNarrator implements Narrator {
  private model: string;

  constructor(model = process.env.DENKEN_NARRATE_MODEL ?? "claude-haiku-4-5") {
    this.model = model;
  }

  async narrate(input: NarrationInput): Promise<Narration> {
    // 動的 import: API を使わない既定経路では @anthropic-ai/sdk を読み込まない。
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const { z } = await import("zod");
    const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");

    const client = new Anthropic(); // ANTHROPIC_API_KEY を環境から解決

    const NarrationSchema = z.object({
      statement: z.string(),
      solution: z.array(z.string()),
    });

    const userText = [
      `topic: ${input.topic} / subject: ${input.subject}`,
      `answerText(最終的な答え, 厳守): ${input.answerText} ${input.answerUnit}`,
      `facts(変更禁止の数値): ${JSON.stringify(input.facts)}`,
      ``,
      `既定の問題文:`,
      input.defaultStatement,
      ``,
      `既定の解法ステップ:`,
      ...input.defaultSolution.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n");

    const response = await client.messages.parse({
      model: this.model,
      max_tokens: 2048,
      system: [
        { type: "text", text: NARRATION_SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userText }],
      // zod v3(schema 検証用) と SDK の zod v4 型の差をここで吸収（実行時は問題なし）。
      output_config: { format: zodOutputFormat(NarrationSchema as never) },
    });

    const parsed = response.parsed_output as Narration | null;
    if (!parsed) {
      // パース失敗時は既定文にフォールバック（数値の安全側）。
      return { statement: input.defaultStatement, solution: input.defaultSolution };
    }
    return parsed;
  }
}

/** 環境に応じて既定の Narrator を選ぶ。API キーが無ければスタブ。 */
export function defaultNarrator(): Narrator {
  return process.env.ANTHROPIC_API_KEY ? new AnthropicNarrator() : new StubNarrator();
}
