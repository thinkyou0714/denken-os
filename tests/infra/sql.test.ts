/**
 * Supabase マイグレーションのガードテスト（DDLは実行できないが、
 * RLS有効化・ユーザー所有ポリシーの欠落を機械的に検知する）。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "../../supabase/migrations/0001_init.sql"), "utf8").toLowerCase();

describe("supabase 0001_init.sql", () => {
  it("主要テーブルを定義している", () => {
    for (const t of ["public.problems", "public.answer_logs", "public.review_states"]) {
      expect(sql).toContain(`create table if not exists ${t}`);
    }
  });

  it("全テーブルで RLS を有効化している（公開スキーマの必須事項）", () => {
    const count = (sql.match(/enable row level security/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("ユーザー所有データは auth.uid() で制限している", () => {
    expect(sql).toContain("auth.uid() = user_id");
  });

  it("ポリシー列にインデックスがある（性能のベストプラクティス）", () => {
    expect(sql).toContain("answer_logs_user_idx");
    expect(sql).toContain("review_states_user_idx");
  });
});
