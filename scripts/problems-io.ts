/**
 * problems-io.ts — data/problems の読み込みヘルパー（無副作用・テスト可能）。
 *
 * トップレベルで実行（main）するスクリプトに同居させると import 時に副作用が走るため、
 * 読取ロジックだけを独立モジュールに切り出す。
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Problem, problemSchema } from "../lib/engine/schema.js";

export interface ProblemJsonItem {
  /** JSON ファイル名（例: T-0001.json）。 */
  file: string;
  /** エラーメッセージ用ラベル。配列要素は file.json[0] 形式。 */
  label: string;
  /** パース済みの生 JSON 値。 */
  raw: unknown;
}

export interface ProblemJsonReadError {
  file: string;
  path: string;
  error: unknown;
}

export interface ProblemJsonReadResult {
  items: ProblemJsonItem[];
  errors: ProblemJsonReadError[];
}

/** ディレクトリ直下の JSON ファイル名を返す（既存スクリプトと同じ readdirSync 順）。 */
export function listJsonFiles(dataDir: string): string[] {
  return readdirSync(dataDir).filter((f) => f.endsWith(".json"));
}

/** 単一 JSON 値または配列 JSON を、検証前の問題候補一覧へ正規化する。 */
export function toProblemJsonItems(file: string, data: unknown): ProblemJsonItem[] {
  const values = Array.isArray(data) ? data : [data];
  return values.map((raw, idx) => ({
    file,
    label: Array.isArray(data) ? `${file}[${idx}]` : file,
    raw,
  }));
}

/** data/problems 形式の JSON ファイル群を読み、parse エラーと問題候補を分けて返す。 */
export function readProblemJsonItems(dataDir: string): ProblemJsonReadResult {
  const items: ProblemJsonItem[] = [];
  const errors: ProblemJsonReadError[] = [];
  for (const file of listJsonFiles(dataDir)) {
    const path = join(dataDir, file);
    try {
      const data = JSON.parse(readFileSync(path, "utf8")) as unknown;
      items.push(...toProblemJsonItems(file, data));
    } catch (error) {
      errors.push({ file, path, error });
    }
  }
  return { items, errors };
}

/** data/problems の schema 妥当な問題だけを読み込む。 */
export function readValidProblems(dataDir: string): Problem[] {
  const out: Problem[] = [];
  const { items, errors } = readProblemJsonItems(dataDir);
  if (errors.length > 0) throw errors[0]?.error;
  for (const item of items) {
    const r = problemSchema.safeParse(item.raw);
    if (r.success) out.push(r.data);
  }
  return out;
}
