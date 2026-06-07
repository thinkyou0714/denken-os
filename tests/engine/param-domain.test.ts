/**
 * param-domain (DI-7): 離散ドメインの一級表現。
 *   - domainIssue の単体検査（enum / 偶数）
 *   - SSOT 整合: テンプレ paramSpec.domain と データゲート DEFAULT_PARAM_DOMAINS の一致（drift 封鎖）
 *   - 生成不変条件: generate() が宣言ドメインに反する値を出さない（多数 seed）
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAM_DOMAINS, domainIssue, domainsEqual } from "../../lib/engine/param-domain.js";
import { getTemplate, listTopics } from "../../lib/engine/templates/index.js";

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("domainIssue（離散ドメイン検査）", () => {
  it("enum: 含まれれば null、外れれば量名付き理由", () => {
    const freq = { kind: "enum", values: [50, 60], label: "商用周波数" } as const;
    expect(domainIssue(50, freq)).toBeNull();
    expect(domainIssue(60, freq)).toBeNull();
    const msg = domainIssue(55, freq);
    expect(msg).toContain("周波数");
    expect(msg).toContain("55");
  });

  it("evenIntegerAtLeast: 偶数かつ min 以上のみ可", () => {
    const poles = { kind: "evenIntegerAtLeast", min: 2, label: "極数" } as const;
    expect(domainIssue(2, poles)).toBeNull();
    expect(domainIssue(12, poles)).toBeNull();
    expect(domainIssue(7, poles)).toContain("偶数"); // 奇数
    expect(domainIssue(0, poles)).toContain("偶数"); // min 未満
    expect(domainIssue(4.5, poles)).toContain("偶数"); // 非整数
  });

  it("domainsEqual: 種別・内容が一致するときだけ true", () => {
    expect(domainsEqual({ kind: "enum", values: [50, 60] }, { kind: "enum", values: [50, 60] })).toBe(true);
    expect(domainsEqual({ kind: "enum", values: [50, 60] }, { kind: "enum", values: [50] })).toBe(false);
    expect(domainsEqual({ kind: "evenIntegerAtLeast", min: 2 }, { kind: "evenIntegerAtLeast", min: 2 })).toBe(true);
    expect(domainsEqual({ kind: "enum", values: [50] }, { kind: "evenIntegerAtLeast", min: 2 })).toBe(false);
  });
});

describe("SSOT 整合（テンプレ宣言 ⇔ データゲート既定表）", () => {
  it("テンプレが宣言する domain は DEFAULT_PARAM_DOMAINS と構造一致する（drift しない）", () => {
    for (const topic of listTopics()) {
      const t = getTemplate(topic)!;
      for (const [name, spec] of Object.entries(t.paramSpecs)) {
        if (!spec.domain) continue;
        const gate = DEFAULT_PARAM_DOMAINS[name];
        expect(gate, `${topic}.${name}: データゲートに既定ドメインが必要`).toBeDefined();
        expect(domainsEqual(spec.domain, gate!), `${topic}.${name}: 宣言とゲートが不一致`).toBe(true);
      }
    }
  });

  it("DEFAULT_PARAM_DOMAINS の各キーは少なくとも 1 テンプレが宣言する（孤立ルールが無い）", () => {
    const declared = new Set<string>();
    for (const topic of listTopics()) {
      const t = getTemplate(topic)!;
      for (const [name, spec] of Object.entries(t.paramSpecs)) {
        if (spec.domain) declared.add(name);
      }
    }
    for (const key of Object.keys(DEFAULT_PARAM_DOMAINS)) {
      expect(declared.has(key), `${key}: どのテンプレも宣言していない孤立ゲート`).toBe(true);
    }
  });
});

describe("生成不変条件（generate が宣言ドメインを破らない）", () => {
  for (const topic of listTopics()) {
    it(`${topic}: 全 draw が宣言ドメインを満たす`, () => {
      const t = getTemplate(topic)!;
      const withDomain = Object.entries(t.paramSpecs).filter(([, s]) => s.domain);
      if (withDomain.length === 0) return; // 離散宣言が無いテンプレは対象外
      const rng = seededRng(98765);
      let drawn = 0;
      for (let i = 0; i < 400 && drawn < 80; i++) {
        const g = t.generate(rng);
        if (!g) continue;
        drawn += 1;
        for (const [name, spec] of withDomain) {
          const pv = g.params[name];
          expect(pv, `${topic}.${name} が draw に存在`).toBeDefined();
          expect(domainIssue(pv!.value, spec.domain!), `${topic}.${name}=${pv?.value} がドメイン違反`).toBeNull();
        }
      }
      expect(drawn).toBeGreaterThan(0);
    });
  }
});
