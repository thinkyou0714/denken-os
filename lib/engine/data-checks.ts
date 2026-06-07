/**
 * data-checks.ts — JSON Schema(draft-07) では表現できない「コード側のデータ不変条件」。
 * validate-problems.ts(CI ゲート) が使う純関数として切り出し、単体テスト可能にする。
 *   - paramIssues: params.value ∈ realistic_range（B2）+ 物理/制度的な離散ドメイン（DI-4）
 *   - citationIssue: 出典 citation の必須 + 書式（DI-6）
 */

export interface ParamLike {
  value: number;
  unit?: string;
  realistic_range?: [number, number];
}

/**
 * 連続レンジ(realistic_range)では表せない離散・列挙の制約。
 * 例: 誘導機の極数は2以上の偶数、商用周波数は50か60のみ（55Hz グリッドは無い）。
 */
const PARAM_DOMAIN_RULES: Record<string, (v: number) => string | null> = {
  poles: (v) =>
    Number.isInteger(v) && v >= 2 && v % 2 === 0 ? null : `極数は2以上の偶数である必要があります（実在しない値: ${v}）`,
  frequency: (v) => (v === 50 || v === 60 ? null : `商用周波数は50または60Hzです（不正: ${v}）`),
};

/** params の範囲(B2)＋離散ドメイン(DI-4)違反を列挙する。 */
export function paramIssues(params: Record<string, ParamLike> | undefined): string[] {
  const issues: string[] = [];
  if (!params || typeof params !== "object") return issues;
  for (const [name, p] of Object.entries(params)) {
    if (!p || typeof p.value !== "number") continue;
    const r = p.realistic_range;
    if (Array.isArray(r) && r.length === 2 && (p.value < r[0] || p.value > r[1])) {
      issues.push(`params.${name}.value=${p.value} が realistic_range [${r[0]}, ${r[1]}] の外です`);
    }
    const rule = PARAM_DOMAIN_RULES[name];
    if (rule) {
      const msg = rule(p.value);
      if (msg) issues.push(`params.${name}: ${msg}`);
    }
  }
  return issues;
}

// 出典の年度参照（令和/平成/昭和 or 西暦4桁）。past_exam_* の citation 書式の最低条件。
const CITATION_YEAR = /(令和|平成|昭和|\d{4})/;

/** 出典 citation の必須(original 以外)＋書式(DI-6)違反を返す（無ければ null）。 */
export function citationIssue(source: { type: string; citation?: string } | undefined): string | null {
  if (!source || source.type === "original") return null;
  const c = source.citation?.trim() ?? "";
  if (c.length === 0) return `source.type=${source.type} は citation 必須です`;
  if (!CITATION_YEAR.test(c)) {
    return `source.type=${source.type} の citation は年度（令和/平成/西暦4桁）を含む必要があります: "${c}"`;
  }
  return null;
}

/**
 * numeric の answer は単位なしの数値文字列であること（E4）。
 * web/grade.ts が Number(answer) で採点するため、'4.6Ω' 等だと全回答が NaN=不正解化する潜在バグを防ぐ。
 */
export function numericAnswerIssue(p: { format?: string; answer?: unknown }): string | null {
  if (p.format === "numeric" && !Number.isFinite(Number(p.answer))) {
    return `numeric の answer は単位なしの数値文字列である必要があります: "${String(p.answer)}"`;
  }
  return null;
}
