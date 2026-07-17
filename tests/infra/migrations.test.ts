/**
 * tests/infra/migrations.test.ts
 *
 * Supabase マイグレーションの「強い静的検証」テスト。
 *
 * ねらい（tests/infra/sql.test.ts の単純な substring チェックを超える保証）:
 *   1. ファイルの命名・連番が崩れていない（NNNN_*.sql の昇順・欠番なし）。
 *   2. 各マイグレーションを **文単位** に分解し、文の種類と順序を検証する。
 *      特に「既存 NULL を埋める UPDATE が SET NOT NULL より前にある」ことを、
 *      文字列の出現位置ではなく実際の文の並び順で確認する（Codex#3 回帰防止）。
 *   3. ユーザー所有テーブルで RLS が有効化され、SELECT/INSERT/UPDATE/DELETE の
 *      ポリシーが table×command 単位で揃っていることを検証する。
 *   4. 列ガード（topic 非空）・FK の ON DELETE 動作・CHECK 制約・主キーなど、
 *      アプリの不変条件に直結する DDL の存在を検証する。
 *
 * 補足: 本リポジトリのマイグレーションは Supabase 専用機能（RLS / CREATE POLICY /
 *   auth スキーマ・auth.uid()）に依存しており、純 JS の in-memory Postgres（pg-mem）では
 *   これらの構文をパースできない（RLS/POLICY 未対応・auth スキーマ非存在）。
 *   そのため「実 DB へ apply して検査」ではなく、SQL を構造的にパースして検査する方式を採る。
 *   将来 CI で本物の Postgres を起動できるなら、apply ベースのテストへ差し替える余地がある
 *   （follow-up）。
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIG_DIR = join(__dirname, "../../supabase/migrations");

// ── 軽量 SQL 文スプリッタ ──────────────────────────────────────────────────
// 行コメント（-- …）を除去し、ドル引用（$$ … $$）と単一引用符内のセミコロンを
// 文区切りとして扱わないようにしつつ、トップレベルの ";" で文へ分割する。
// 完全な SQL パーサではないが、本リポジトリのマイグレーション DDL を文単位で
// 取り出すには十分。検証ロジックが構文へ過度に依存しないよう小文字化して扱う。
function splitStatements(rawSql: string): string[] {
  // 行コメントの除去（文字列リテラル内の "--" は本リポジトリには存在しないため単純除去で安全）。
  const noComments = rawSql
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");

  const statements: string[] = [];
  let buf = "";
  let inSingleQuote = false;
  let inDollar = false; // $$ … $$ ブロック内か
  for (let i = 0; i < noComments.length; i++) {
    const ch = noComments[i];
    const next2 = noComments.slice(i, i + 2);

    if (!inSingleQuote && next2 === "$$") {
      inDollar = !inDollar;
      buf += next2;
      i += 1;
      continue;
    }
    if (!inDollar && ch === "'") {
      inSingleQuote = !inSingleQuote;
      buf += ch;
      continue;
    }
    if (ch === ";" && !inSingleQuote && !inDollar) {
      const trimmed = buf.trim();
      if (trimmed) statements.push(trimmed);
      buf = "";
      continue;
    }
    buf += ch;
  }
  const tail = buf.trim();
  if (tail) statements.push(tail);

  // 空白を正規化して小文字化（検査側の正規表現を読みやすくする）。
  return statements.map((s) => s.replace(/\s+/g, " ").trim().toLowerCase());
}

function readMigration(file: string): string {
  return readFileSync(join(MIG_DIR, file), "utf8");
}

function statementsOf(file: string): string[] {
  return splitStatements(readMigration(file));
}

// マイグレーションファイル一覧（昇順）。
const migrationFiles = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// ── 1. ファイル命名・連番 ────────────────────────────────────────────────
describe("マイグレーションのファイル命名と連番", () => {
  it("少なくとも 0001〜0005 の 5 本が存在する", () => {
    expect(migrationFiles.length).toBeGreaterThanOrEqual(5);
  });

  it("全ファイルが NNNN_*.sql 形式である", () => {
    for (const f of migrationFiles) {
      expect(f).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
    }
  });

  it("連番が 1 始まりで欠番・重複なく連続している", () => {
    const numbers = migrationFiles.map((f) => Number.parseInt(f.slice(0, 4), 10));
    // 昇順ソート済みなので i 番目は i+1 のはず。
    numbers.forEach((n, i) => {
      expect(n).toBe(i + 1);
    });
    // 重複なし。
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("各マイグレーションは少なくとも 1 文を含む（空ファイルでない）", () => {
    for (const f of migrationFiles) {
      expect(statementsOf(f).length).toBeGreaterThan(0);
    }
  });
});

// ── 2. 0001_init: 主要テーブル・RLS・ポリシー・制約 ──────────────────────
describe("0001_init.sql: スキーマ初期化", () => {
  const stmts = statementsOf("0001_init.sql");

  it("problems / answer_logs / review_states を CREATE TABLE している", () => {
    for (const t of ["public.problems", "public.answer_logs", "public.review_states"]) {
      const found = stmts.some((s) => s.startsWith("create table") && s.includes(t));
      expect(found, `CREATE TABLE ${t} が見つからない`).toBe(true);
    }
  });

  it("ユーザー所有 3 テーブルで RLS を有効化している", () => {
    for (const t of ["public.problems", "public.answer_logs", "public.review_states"]) {
      const found = stmts.some((s) => s.includes(`alter table ${t}`) && s.includes("enable row level security"));
      expect(found, `${t} の ENABLE ROW LEVEL SECURITY が見つからない`).toBe(true);
    }
  });

  it("problems.difficulty に 1〜5 の CHECK 制約がある", () => {
    const createProblems = stmts.find((s) => s.startsWith("create table") && s.includes("public.problems"));
    expect(createProblems).toBeDefined();
    expect(createProblems).toMatch(/difficulty\s+int\s+not null check\s*\(difficulty between 1 and 5\)/);
  });

  it("problems.status に許可値の CHECK 制約がある", () => {
    const createProblems = stmts.find((s) => s.startsWith("create table") && s.includes("public.problems"));
    expect(createProblems).toMatch(/status in \('draft','validated','published','retracted'\)/);
  });

  it("ユーザー所有テーブルは auth.users(id) を ON DELETE CASCADE で参照する", () => {
    for (const t of ["public.answer_logs", "public.review_states"]) {
      const create = stmts.find((s) => s.startsWith("create table") && s.includes(t));
      expect(create, `${t} の CREATE TABLE が見つからない`).toBeDefined();
      expect(create).toMatch(/references auth\.users \(id\) on delete cascade/);
    }
  });

  it("review_states は (user_id, topic) を主キーにしている", () => {
    const create = stmts.find((s) => s.startsWith("create table") && s.includes("public.review_states"));
    expect(create).toMatch(/primary key \(user_id, topic\)/);
  });

  it("ポリシー列にインデックスがある（性能のベストプラクティス）", () => {
    const idxNames = ["answer_logs_user_idx", "review_states_user_idx"];
    for (const idx of idxNames) {
      const found = stmts.some((s) => s.startsWith("create index") && s.includes(idx));
      expect(found, `${idx} の CREATE INDEX が見つからない`).toBe(true);
    }
  });
});

// ── 3. RLS ポリシーの table×command カバレッジ ──────────────────────────
// 全マイグレーションを通して「最終的に」存在するポリシーを table×command 単位で集計する。
// permissive ポリシーは OR 評価のため、所有チェックを含むポリシーが各操作に存在することを要求する。
describe("RLS ポリシーの網羅性（全マイグレーション通算）", () => {
  // すべての CREATE POLICY 文を収集する。
  const allStmts = migrationFiles.flatMap((f) => statementsOf(f));
  const policyStmts = allStmts.filter((s) => s.startsWith("create policy"));

  // "create policy <name> on <table> for <command> ..." を粗くパースする。
  type Pol = { name: string; table: string; command: string; raw: string };
  const policies: Pol[] = policyStmts.map((s) => {
    const m = s.match(/create policy (\S+) on (\S+) for (select|insert|update|delete|all)/);
    return {
      name: m?.[1] ?? "",
      table: m?.[2] ?? "",
      command: m?.[3] ?? "",
      raw: s,
    };
  });

  it("CREATE POLICY 文がすべて name/table/command を解析できる形式である", () => {
    for (const p of policies) {
      expect(p.name, `name 解析失敗: ${p.raw}`).not.toBe("");
      expect(p.table, `table 解析失敗: ${p.raw}`).not.toBe("");
      expect(p.command, `command 解析失敗: ${p.raw}`).not.toBe("");
    }
  });

  const ownerTables = ["public.answer_logs", "public.review_states"];
  const ownerCommands = ["select", "insert", "update", "delete"];

  for (const table of ownerTables) {
    for (const command of ownerCommands) {
      it(`${table} に ${command} の所有ポリシー（auth.uid() = user_id）がある`, () => {
        const matches = policies.filter((p) => p.table === table && p.command === command);
        expect(matches.length, `${table} の ${command} ポリシーが無い`).toBeGreaterThanOrEqual(1);
        // 所有チェックを含むポリシーが少なくとも 1 つあること。
        const hasOwnerCheck = matches.some((p) => p.raw.includes("auth.uid() = user_id"));
        expect(hasOwnerCheck, `${table} の ${command} に auth.uid() = user_id チェックが無い`).toBe(true);
      });
    }
  }

  it("problems には公開読み取りポリシー（status = 'published'）がある", () => {
    const pub = policies.find((p) => p.table === "public.problems" && p.command === "select");
    expect(pub).toBeDefined();
    expect(pub?.raw).toMatch(/status = 'published'/);
  });
});

// ── 3b. 全 public テーブルの RLS 有効化（テーブル名列挙の穴を塞ぐ）────────
// 上のセクションはテーブル名を列挙して検査するため、「RLS を付け忘れた新テーブル」を
// 検出できない。ここでは全マイグレーションから CREATE TABLE を機械的に抽出し、
// どのテーブルにも ENABLE ROW LEVEL SECURITY があることを要求する（意図的に RLS を
// 外す場合は明示的な allowlist に追加して理由を残すこと）。
describe("全 public テーブルで RLS が有効化されている（全マイグレーション通算）", () => {
  const allStmts = migrationFiles.flatMap((f) => statementsOf(f));
  const createdTables = new Set<string>();
  for (const s of allStmts) {
    const m = s.match(/^create table (?:if not exists )?(public\.[a-z0-9_]+)/);
    if (m?.[1]) createdTables.add(m[1]);
  }
  // RLS を意図的に有効化しないテーブル（現状なし）。追加する場合は理由コメント必須。
  const rlsExempt = new Set<string>();

  it("CREATE TABLE の抽出が機能している（パーサ自壊の検知）", () => {
    expect(createdTables.size).toBeGreaterThanOrEqual(5);
    expect(createdTables.has("public.problems")).toBe(true);
    expect(createdTables.has("public.entitlements")).toBe(true);
  });

  for (const table of [...createdTables].sort()) {
    if (rlsExempt.has(table)) continue;
    it(`${table} に ENABLE ROW LEVEL SECURITY がある`, () => {
      const found = allStmts.some(
        (s) => s.startsWith(`alter table ${table}`) && s.includes("enable row level security"),
      );
      expect(found, `${table} の ENABLE ROW LEVEL SECURITY が見つからない — 新テーブルには必ず RLS を付けること`).toBe(
        true,
      );
    });
  }
});

// ── 4. 0002: updated_at トリガと search_path 固定 ───────────────────────
describe("0002_problems_updated_at.sql: updated_at トリガ", () => {
  const raw = readMigration("0002_problems_updated_at.sql").toLowerCase();
  const stmts = statementsOf("0002_problems_updated_at.sql");

  it("set_updated_at 関数を定義している", () => {
    expect(raw).toContain("function public.set_updated_at()");
  });

  it("関数の search_path を空に固定している（可変 search_path を塞ぐ）", () => {
    expect(raw).toContain("set search_path = ''");
  });

  it("problems への BEFORE UPDATE トリガを張っている", () => {
    const trigger = stmts.find((s) => s.startsWith("create trigger"));
    expect(trigger).toBeDefined();
    expect(trigger).toContain("before update on public.problems");
    expect(trigger).toContain("execute function public.set_updated_at()");
  });
});

// ── 5. 0003: 追加インデックス ─────────────────────────────────────────────
describe("0003_indexes.sql: FK 検索パスのインデックス", () => {
  const stmts = statementsOf("0003_indexes.sql");

  it("answer_logs(problem_id) のインデックスを追加している（FK の seq scan 防止）", () => {
    const found = stmts.some(
      (s) => s.startsWith("create index") && s.includes("answer_logs_problem_idx") && s.includes("(problem_id)"),
    );
    expect(found).toBe(true);
  });

  it("全文が CREATE INDEX のみで、テーブル定義や RLS を変更していない", () => {
    for (const s of stmts) {
      expect(s.startsWith("create index"), `想定外の文: ${s}`).toBe(true);
    }
  });
});

// ── 6. 0004: NOT NULL バックフィル順序・FK 変更・DELETE ポリシー ───────────
describe("0004_rls_fk_notnull.sql: 制約補完", () => {
  const stmts = statementsOf("0004_rls_fk_notnull.sql");

  it("difficulty の NULL を埋める UPDATE が、SET NOT NULL より前に出現する（Codex#3 回帰防止）", () => {
    // 文字列位置ではなく「文の並び順」で前後関係を検証する。
    const backfillIdx = stmts.findIndex(
      (s) =>
        s.startsWith("update") &&
        s.includes("public.review_states") &&
        /set difficulty = 5\.17 where difficulty is null/.test(s),
    );
    const notNullIdx = stmts.findIndex(
      (s) => s.startsWith("alter table") && /alter column difficulty set not null/.test(s),
    );

    expect(backfillIdx, "difficulty バックフィル UPDATE が無い").toBeGreaterThanOrEqual(0);
    expect(notNullIdx, "difficulty SET NOT NULL が無い").toBeGreaterThanOrEqual(0);
    expect(backfillIdx).toBeLessThan(notNullIdx);
  });

  it("difficulty に default 5.17 を設定している（FSRS 初期値）", () => {
    const found = stmts.some((s) => s.startsWith("alter table") && /alter column difficulty set default 5\.17/.test(s));
    expect(found).toBe(true);
  });

  it("answer_logs.problem_id の FK を ON DELETE SET NULL へ張り替えている", () => {
    // 旧制約 DROP → 新制約 ADD（ON DELETE SET NULL）の順で存在すること。
    const dropIdx = stmts.findIndex((s) => s.includes("drop constraint if exists answer_logs_problem_id_fkey"));
    const addIdx = stmts.findIndex(
      (s) =>
        s.includes("add constraint answer_logs_problem_id_fkey") &&
        s.includes("references public.problems (id) on delete set null"),
    );
    expect(dropIdx, "旧 FK 制約の DROP が無い").toBeGreaterThanOrEqual(0);
    expect(addIdx, "ON DELETE SET NULL の新 FK 制約が無い").toBeGreaterThanOrEqual(0);
    expect(dropIdx).toBeLessThan(addIdx);
  });

  it("answer_logs / review_states に DELETE ポリシーを追加している", () => {
    for (const t of ["public.answer_logs", "public.review_states"]) {
      const found = stmts.some((s) => s.startsWith("create policy") && s.includes(t) && s.includes("for delete"));
      expect(found, `${t} の DELETE ポリシーが無い`).toBe(true);
    }
  });
});

// ── 7. 0005: 列ガード（topic 非空）を同名置換で追加 ─────────────────────
describe("0005_rls_column_checks.sql: 列内容ガード", () => {
  const stmts = statementsOf("0005_rls_column_checks.sql");

  // 同名ポリシーを置換する必要があるため、各 CREATE POLICY の直前に同名 DROP がある設計。
  it("topic 非空ガードを持つ INSERT/UPDATE ポリシーが存在する", () => {
    const guarded = stmts.filter((s) => s.startsWith("create policy") && /length\(btrim\(topic\)\) > 0/.test(s));
    // answer_logs(insert) / review_states(insert) / review_states(update) の 3 本を想定。
    expect(guarded.length).toBeGreaterThanOrEqual(3);
    for (const g of guarded) {
      expect(g).toContain("topic is not null");
    }
  });

  it("置換対象ポリシーは『同名 DROP → 同名 CREATE』の対で更新している（OR 評価による緩和を防ぐ）", () => {
    const creates = stmts.filter((s) => s.startsWith("create policy"));
    for (const c of creates) {
      const name = c.match(/create policy (\S+) on/)?.[1];
      expect(name, `ポリシー名解析失敗: ${c}`).toBeTruthy();
      const hasDrop = stmts.some((s) => s.startsWith("drop policy") && s.includes(`if exists ${name} `));
      expect(hasDrop, `${name} の DROP POLICY IF EXISTS が無い（緩い既存ポリシーが残る危険）`).toBe(true);
    }
  });
});
