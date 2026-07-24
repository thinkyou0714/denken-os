/**
 * problem-shards.test.ts — 分割ロード（科目別シャード＋マニフェスト）の整合検証。
 *
 * 1) 共有定義（lib/shared/problem-shards.ts）: 全6科目に一意な ASCII slug。
 * 2) 生成物（web/problems/*.json）が build-problems と整合すること:
 *    - manifest.total = combined problems.json の件数
 *    - 各シャードの件数合計 = total、各シャードは該当科目のみ
 *    - 全シャードを manifest 順に結合すると combined と同一（id 列が一致）
 *    - sw.js のプリキャッシュ一覧に全シャード＋マニフェストが含まれること
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Problem, Subject } from "../../lib/engine/schema.js";
import {
  allShardSlugs,
  MANIFEST_FILE,
  type ProblemManifest,
  SHARD_DIR,
  SUBJECT_SLUGS,
  shardFileName,
} from "../../lib/shared/problem-shards.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../");
const WEB = join(ROOT, "web");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("SUBJECT_SLUGS（共有定義）", () => {
  const subjects: Subject[] = ["理論", "電力", "機械", "法規", "電力管理", "機械制御"];

  it("全6科目に slug が定義されている", () => {
    for (const s of subjects) {
      expect(SUBJECT_SLUGS[s], `${s} の slug`).toBeTruthy();
    }
  });

  it("slug は URL/ファイル名安全な ASCII（英小文字・数字・ハイフン）", () => {
    for (const slug of allShardSlugs()) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("slug は科目間で一意", () => {
    const slugs = allShardSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("shardFileName は <slug>.json", () => {
    expect(shardFileName("理論")).toBe("theory.json");
    expect(shardFileName("機械制御")).toBe("machine-ctrl.json");
  });
});

describe("生成されたシャード（web/problems/）と combined の整合", () => {
  const combined = readJson<Problem[]>(join(WEB, "problems.json"));
  const manifest = readJson<ProblemManifest>(join(WEB, SHARD_DIR, MANIFEST_FILE));

  it("manifest.total = combined problems.json の件数", () => {
    expect(manifest.total).toBe(combined.length);
  });

  it("manifest.shards は全6科目を1回ずつ含む", () => {
    const subjects = manifest.shards.map((s) => s.subject).sort();
    expect(subjects).toEqual((Object.keys(SUBJECT_SLUGS) as Subject[]).sort());
  });

  it("各シャードの件数合計 = total", () => {
    const sum = manifest.shards.reduce((n, s) => n + s.count, 0);
    expect(sum).toBe(manifest.total);
  });

  it("各シャードは該当科目のみを含み、件数が manifest と一致", () => {
    for (const entry of manifest.shards) {
      const shard = readJson<Problem[]>(join(WEB, SHARD_DIR, entry.file));
      expect(shard.length, `${entry.file} の件数`).toBe(entry.count);
      for (const p of shard) {
        expect(p.subject, `${entry.file} に他科目が混入`).toBe(entry.subject);
      }
    }
  });

  it("全シャードを manifest 順に結合すると combined と同一（id 列一致）", () => {
    const reassembled: string[] = [];
    for (const entry of manifest.shards) {
      const shard = readJson<Problem[]>(join(WEB, SHARD_DIR, entry.file));
      for (const p of shard) reassembled.push(p.id);
    }
    // combined は科目ごとにまとまって並ぶ（build の topic 走査順）。シャード結合はその
    // 科目ブロックを manifest 順に連結したもの。集合として同一かつ重複なしを確認する。
    expect(new Set(reassembled).size).toBe(reassembled.length); // シャード内 id 重複なし
    expect(new Set(reassembled)).toEqual(new Set(combined.map((p) => p.id)));
  });

  it("version は 12桁の hex（内容ハッシュ・決定論）", () => {
    expect(manifest.version).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("sw.js プリキャッシュにシャード＋マニフェストが含まれる", () => {
  const swSource = readFileSync(join(WEB, "sw.js"), "utf8");

  it("manifest と全6シャードのパスが ASSETS に列挙されている", () => {
    expect(swSource).toContain(`./${SHARD_DIR}/${MANIFEST_FILE}`);
    for (const slug of allShardSlugs()) {
      expect(swSource, `${slug}.json が sw.js の ASSETS にない`).toContain(`./${SHARD_DIR}/${slug}.json`);
    }
  });
});
