import { describe, expect, it } from "vitest";
import { parseUtm, quizLink, withUtm } from "../../lib/analytics/utm.js";

describe("UTM 流入計測（07）", () => {
  it("UTM パラメータを付与する", () => {
    const url = withUtm("https://denken-os.app/", {
      source: "x",
      medium: "profile",
      campaign: "today-quiz",
      content: "T-0127",
    });
    expect(url).toContain("utm_source=x");
    expect(url).toContain("utm_campaign=today-quiz");
    expect(url).toContain("utm_content=T-0127");
  });

  it("quizLink は問題IDを content に入れる", () => {
    const url = quizLink("https://denken-os.app/q", "T-0001", "reply");
    const parsed = parseUtm(url);
    expect(parsed.campaign).toBe("today-quiz");
    expect(parsed.content).toBe("T-0001");
    expect(parsed.medium).toBe("reply");
  });

  it("既存クエリを保持する", () => {
    const url = withUtm("https://denken-os.app/?ref=abc", { source: "x", medium: "social", campaign: "c" });
    expect(url).toContain("ref=abc");
    expect(url).toContain("utm_source=x");
  });
});
