import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import { inductionMotorSpeed, listTopics, resistorNetwork } from "../../lib/engine/templates/index.js";
import { validateProblem } from "../../lib/engine/validate.js";
import { seededRng } from "../helpers/rng.js";

describe("追加テンプレート（無限生成エンジンのmoat強化）", () => {
  it("レジストリに3テンプレ（理論/機械含む）が登録されている", () => {
    const topics = listTopics();
    expect(topics).toContain("三相交流電力");
    expect(topics).toContain("誘導電動機の回転速度");
    expect(topics).toContain("直並列合成抵抗");
  });

  it("誘導電動機: Ns=120f/p, N=Ns(1-s/100) を正しく算出", () => {
    const g = inductionMotorSpeed.generateFrom({ frequency: 50, poles: 4, slip: 5 });
    expect(g).not.toBeNull();
    // Ns=1500, N=1425
    expect(g!.answerText).toBe("1425");
    expect(g!.choices).toContain("1425");
    expect(g!.choices).toContain("1500"); // 滑り忘れの誤答
  });

  it("直並列合成抵抗: R1 + R2∥R3 を正しく算出", () => {
    const g = resistorNetwork.generateFrom({ R1: 10, R2: 20, R3: 20 });
    expect(g).not.toBeNull();
    // 並列=10, total=20
    expect(g!.answerText).toBe("20");
    expect(g!.choices).toContain("20");
    expect(g!.choices).toContain("50"); // 全部直列の誤答
  });

  it("各テンプレで50問生成→全件 validate 通過 / answer∈choices", async () => {
    for (const t of [inductionMotorSpeed, resistorNetwork]) {
      const problems = await generate(t, { count: 50, narrator: new StubNarrator(), rng: seededRng(99) });
      expect(problems.length).toBe(50);
      for (const p of problems) {
        expect(validateProblem(p).ok).toBe(true);
        expect(p.choices).toContain(p.answer);
      }
    }
  });
});
