import type { Problem } from "../../../lib/engine/schema.js";
import { api } from "./client.js";
import { isSite } from "./platform.js";

export interface CatalogueProblem extends Problem {
  revision: string;
  family: string;
  verificationOrigin?: string;
}
export interface ServiceManifest {
  version: string;
  catalog: { file: string; sha256: string; count: number };
  experimental: { total: number; shards: { file: string; subject: string; count: number; sha256: string }[] };
}
export let catalogue: CatalogueProblem[] = [];
export let libraryManifest: ServiceManifest | null = null;
async function verifiedJson(url: string, hash: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`教材を取得できません (${response.status})`);
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const actual = [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, "0")).join("");
  if (actual !== hash) throw new Error("教材の版が一致しません。通信状態を確認して再読み込みしてください");
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
function asProblems(value: unknown): CatalogueProblem[] {
  if (!Array.isArray(value)) throw new Error("教材形式を確認できません");
  for (const item of value)
    if (
      !item ||
      typeof item.id !== "string" ||
      typeof item.statement !== "string" ||
      typeof item.answer !== "string" ||
      !Array.isArray(item.solution) ||
      !item.validation
    )
      throw new Error("教材の必須項目が不足しています");
  return value as CatalogueProblem[];
}
export async function loadServiceProblems(): Promise<Problem[]> {
  const response = await fetch("./service/manifest.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("教材一覧を取得できません");
  const manifest = (await response.json()) as ServiceManifest;
  if (!manifest.catalog?.file || !/^[a-z0-9-]+\.json$/.test(manifest.catalog.file))
    throw new Error("教材一覧が不正です");
  const next = asProblems(await verifiedJson(`./service/${manifest.catalog.file}`, manifest.catalog.sha256));
  if (next.length !== manifest.catalog.count) throw new Error("教材件数が一致しません");
  if (
    next.some(
      (p) =>
        (p.status !== "validated" && p.status !== "published") ||
        !(p.validation.human_checked || p.validation.supervisor_checked),
    )
  )
    throw new Error("通常学習に未確認の教材が含まれています");
  libraryManifest = manifest;
  catalogue = next;
  if (isSite) {
    try {
      const live = await api<{ problems: unknown }>("catalog");
      catalogue = asProblems(live.problems);
    } catch (error) {
      if (navigator.onLine) throw error;
    }
  }

  return catalogue;
}
export async function loadExperimentalSubject(subject: string): Promise<CatalogueProblem[]> {
  if (!libraryManifest) await loadServiceProblems();
  const shard = libraryManifest?.experimental.shards.find((s) => s.subject === subject);
  if (!shard || !/^[a-z-]+\.json$/.test(shard.file)) throw new Error("この科目の検証用教材はありません");
  const rows = asProblems(await verifiedJson(`./problems/${shard.file}`, shard.sha256));
  if (rows.length !== shard.count) throw new Error("検証用教材の件数が一致しません");
  return rows.map((p) => ({ ...p, revision: shard.sha256, family: p.topic }));
}
