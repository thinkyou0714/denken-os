/**
 * A1: 数式→読み上げ変換。危険記号(√ ² Ω μ ≈ 等)が読み下されることを固定する。
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mathToSpeech } from "../../web/src/math-speech.js";

describe("mathToSpeech", () => {
  it("代表的な数式を読み下す", () => {
    const out = mathToSpeech("|Z|=√(3²+4²)=5Ω");
    expect(out).toContain("ルート(");
    expect(out).toContain("の2乗");
    expect(out).toContain("オーム");
    expect(out).not.toMatch(/[√²Ω]/);
  });

  it("単位 〔kW〕 と μ を読み下す", () => {
    expect(mathToSpeech("P〔kW〕")).toContain("単位kW");
    expect(mathToSpeech("10μF")).toContain("マイクロ");
  });

  it("全 data 問題の statement に危険記号の読み残しが無い", () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const dir = join(__dirname, "../../data/problems");
    const dangerous = /[√²³×·÷≈Ωμ]/;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const p = JSON.parse(readFileSync(join(dir, f), "utf8"));
      for (const text of [p.statement, ...(p.solution ?? [])]) {
        expect(dangerous.test(mathToSpeech(String(text))), `${f}: 読み残し in "${text}"`).toBe(false);
      }
    }
  });
});
