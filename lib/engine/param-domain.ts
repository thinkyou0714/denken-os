/**
 * param-domain.ts — 離散パラメータ・ドメインの一級表現（DI-7）。
 *
 * realistic_range（連続レンジ）では表せない離散制約（極数=偶数 / 商用周波数∈{50,60} 等）を
 * 「宣言データ」として持つ。これにより:
 *   1. テンプレートが paramSpec.domain で宣言できる（生成不変条件テストの基準になる）。
 *   2. データゲート（validate-problems → data-checks）が同じ表現を共有し、
 *      テンプレ宣言とゲートの二重保守を排除できる（drift は consistency テストが封じる）。
 *
 * 旧実装はチェックを param 名→クロージャの暗黙ルールに埋めていた（DI-4）。本モジュールで
 * それを宣言データ（ParamDomain）へ昇格し、生成側とゲート側の単一情報源にする。
 */

/** 離散ドメインの宣言。label は違反メッセージに使う人間可読の量名。 */
export type ParamDomain =
  | { kind: "enum"; values: readonly number[]; label?: string }
  | { kind: "evenIntegerAtLeast"; min: number; label?: string };

/** value が domain を満たすか検査し、満たさなければ日本語の違反理由、満たせば null。 */
export function domainIssue(value: number, domain: ParamDomain): string | null {
  switch (domain.kind) {
    case "enum": {
      if (domain.values.includes(value)) return null;
      const label = domain.label ?? "値";
      return `${label}は ${domain.values.join(", ")} のいずれかである必要があります（不正: ${value}）`;
    }
    case "evenIntegerAtLeast": {
      if (Number.isInteger(value) && value >= domain.min && value % 2 === 0) return null;
      const label = domain.label ?? "値";
      return `${label}は${domain.min}以上の偶数である必要があります（実在しない値: ${value}）`;
    }
  }
}

/**
 * データゲート（problem JSON は template 参照を持たない）が使う既定ドメイン表。
 * テンプレートの paramSpec.domain が単一情報源で、本表との一致は param-domain.test.ts の
 * consistency テストが保証する（どちらかを変えると test が落ちる＝drift しない）。
 */
export const DEFAULT_PARAM_DOMAINS: Record<string, ParamDomain> = {
  poles: { kind: "evenIntegerAtLeast", min: 2, label: "極数" },
  frequency: { kind: "enum", values: [50, 60], label: "商用周波数" },
};

/** 2 つの ParamDomain が構造的に等価か（consistency テスト用の小さな比較）。 */
export function domainsEqual(a: ParamDomain, b: ParamDomain): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "enum" && b.kind === "enum") {
    return a.values.length === b.values.length && a.values.every((v, i) => v === b.values[i]);
  }
  if (a.kind === "evenIntegerAtLeast" && b.kind === "evenIntegerAtLeast") {
    return a.min === b.min;
  }
  return false;
}
