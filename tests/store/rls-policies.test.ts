/**
 * RLS 不変条件の静的検査（依存なし）。
 * Supabase の行レベルセキュリティはアプリの最重要セキュリティ境界。将来の migration が
 * 誤って RLS を無効化/緩和（例 using(true)）するとユーザーデータが横断流出しうるため、
 * 全 migration SQL を結合して「ユーザー所有テーブルが own-row でしか読み書きできない」
 * 契約をテストで固定する（data-checks/schema-consistency と同じ code-side invariant の流儀）。
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(__dirname, "../../supabase/migrations");

/** 全 migration を結合し、空白を畳んで小文字化（書式差に強い照合用）。 */
const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(MIGRATIONS, f), "utf8"))
  .join("\n")
  .toLowerCase()
  .replace(/\s+/g, " ");

describe("RLS ポリシー不変条件（静的・全 migration）", () => {
  it("公開3テーブルすべてで RLS が有効", () => {
    for (const t of ["problems", "answer_logs", "review_states"]) {
      expect(sql, `${t} の RLS 有効化が無い`).toContain(`alter table public.${t} enable row level security`);
    }
  });

  it("ユーザー所有テーブルは own-row(auth.uid()=user_id) でのみ select できる", () => {
    expect(sql).toContain(
      "create policy answer_logs_select_own on public.answer_logs for select using (auth.uid() = user_id)",
    );
    expect(sql).toContain(
      "create policy review_states_select_own on public.review_states for select using (auth.uid() = user_id)",
    );
  });

  it("ユーザー所有テーブルは insert/update で own-row を with check 強制する", () => {
    expect(sql).toContain("for insert with check (auth.uid() = user_id)");
    expect(sql).toContain(
      "create policy review_states_update_own on public.review_states for update using (auth.uid() = user_id) with check (auth.uid() = user_id)",
    );
  });

  it("problems の公開読み取りは published のみ（下書き/検証中を露出しない）", () => {
    expect(sql).toContain(
      "create policy problems_public_read on public.problems for select using (status = 'published')",
    );
  });

  it("過度に緩いポリシー using(true) が存在しない（横断アクセスの遮断）", () => {
    expect(sql).not.toMatch(/using \(\s*true\s*\)/);
  });
});
