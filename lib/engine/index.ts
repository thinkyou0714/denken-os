/**
 * lib/engine/index.ts — エンジンの単一入口（barrel）（I-018）。
 *
 * このファイルを通じて generate/validate/narrate/schema/templates の
 * 主要 API を一括 import できる。
 * 既存コードの深い import パスは変更しなくてよい（後方互換を維持）。
 *
 * 使用例:
 *   import { generate, validateProblem, defaultNarrator } from "lib/engine/index.js";
 */

export type { ValidationFlags } from "./gate.js";
// --- ゲート ---
export { decideStatus, meetsConfidence, meetsValidationGate } from "./gate.js";
export type { GenerateOneResult, GenerateOptions } from "./generate.js";
// --- 問題生成パイプライン ---
export {
  checkParamsConsistency,
  generate,
  generateOne,
  generateOneDetailed,
  validatePhysics,
} from "./generate.js";
export type { Narration, NarrationInput, Narrator, NarratorFallbackEvent, NarratorTelemetryHook } from "./narrate.js";
// --- ナレーター ---
export {
  AnthropicNarrator,
  CorruptingNarrator,
  DEFAULT_NARRATE_MODEL,
  defaultNarrator,
  StubNarrator,
  toNarrationInput,
} from "./narrate.js";
export type {
  Exam,
  OriginalSource,
  PastExamSource,
  Problem,
  ProblemFormat,
  ProblemStatus,
  SourceType,
  Subject,
} from "./schema.js";
// --- スキーマ型 ---
export {
  examEnum,
  formatEnum,
  originalSourceSchema,
  pastExamSourceSchema,
  problemSchema,
  sourceSchema,
  sourceTypeEnum,
  statsSchema,
  statusEnum,
  subjectEnum,
  validationSchema,
} from "./schema.js";
export type { Template } from "./templates/index.js";
// --- テンプレートレジストリ ---
export { getTemplate, listTopics } from "./templates/index.js";
export type { ValidationIssue, ValidationResult } from "./validate.js";
// --- 問題検証 ---
export {
  answerInChoices,
  answerIsClean,
  narrationMatchesAnswer,
  PARAM_SIMILARITY_THRESHOLD,
  validateProblem,
  validateProblemSet,
} from "./validate.js";
