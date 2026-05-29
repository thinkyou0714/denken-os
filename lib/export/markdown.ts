/**
 * markdown.ts — 検証済み問題を Obsidian 互換 Markdown に書き出す（純関数）。
 * README ビジョン「Obsidian vault 形式でも配布」を実体化。数式は $...$、出典必須。
 */
import type { Problem } from "../engine/schema.js";

const CHOICE_MARKS = ["①", "②", "③", "④", "⑤", "⑥"];

function sourceLine(p: Problem): string {
  if (p.source.type === "original") {
    return `出典: ${p.source.citation ?? "DENKEN-OS オリジナル問題"}`;
  }
  return `出典: ${p.source.citation}（${p.source.type}）`;
}

/** YAML frontmatter を組み立てる（Obsidian のプロパティになる）。 */
function frontmatter(p: Problem): string {
  const lines = [
    "---",
    `id: ${p.id}`,
    p.exam ? `exam: ${p.exam}` : null,
    `subject: ${p.subject}`,
    `topic: ${p.topic}`,
    `difficulty: ${p.difficulty}`,
    `format: ${p.format ?? "multiple_choice"}`,
    `status: ${p.status ?? "draft"}`,
    `source_type: ${p.source.type}`,
    "tags: [電験, " + p.subject + "]",
    "---",
  ].filter((l): l is string => l !== null);
  return lines.join("\n");
}

/** 1問を Obsidian Markdown に変換する。解答・解説は折り畳み（callout）で隠す。 */
export function toObsidianMarkdown(p: Problem): string {
  const parts: string[] = [frontmatter(p), ""];
  parts.push(`# ${p.id} ${p.topic}`, "");
  parts.push(`> 難易度 ${"★".repeat(p.difficulty)}${"☆".repeat(Math.max(0, 5 - p.difficulty))}`, "");
  parts.push(p.statement, "");

  if (p.choices && p.choices.length > 0) {
    parts.push(...p.choices.map((c, i) => `${CHOICE_MARKS[i] ?? `(${i + 1})`} ${c}`), "");
  }

  // Obsidian の折りたたみ callout で解答を隠す。
  parts.push("> [!answer]- 解答・解説");
  parts.push(`> **正解: ${p.answer}**`);
  parts.push(">");
  for (const step of p.solution) parts.push(`> ${step}`);
  parts.push("");
  parts.push(`*${sourceLine(p)}*`, "");
  return parts.join("\n");
}

/** ファイル名に使えない文字をエスケープ。 */
function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "_");
}

export interface VaultFile {
  path: string;
  content: string;
}

/** 問題群を `subject/topic/ID.md` の vault レイアウトに展開する。 */
export function toVaultFiles(problems: Problem[]): VaultFile[] {
  return problems.map((p) => ({
    path: `${safeName(p.subject)}/${safeName(p.topic)}/${p.id}.md`,
    content: toObsidianMarkdown(p),
  }));
}
