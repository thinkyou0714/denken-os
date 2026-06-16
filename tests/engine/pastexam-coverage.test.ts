/**
 * pastexam-coverage.test.ts — 過去問出題傾向カバレッジ集計の検証。
 *
 * 1) 純関数（computeSubjectCoverage / computePastExamCoverage / toTemplateLike /
 *    formatCoverageReport）を手組みフィクスチャで全分岐検証。
 * 2) 実レジストリに対する受入条件（全6科目の全テンプレに pastExam メタが付与され、
 *    area がすべて正準分類に一致＝未知area無し、理論の頻出分野に未カバー無し）を検証。
 */
import { describe, expect, it } from "vitest";
import {
  computePastExamCoverage,
  computeSubjectCoverage,
  formatCoverageReport,
  type PastExamCoverageReport,
  type TemplateLike,
  toTemplateLike,
} from "../../lib/audit/pastexam-coverage.js";
import type { Subject } from "../../lib/engine/schema.js";
import { getTemplate, listTopics } from "../../lib/engine/templates/index.js";
import { areasForSubject, PASTEXAM_WINDOW, trackedSubjects } from "../../lib/engine/templates/pastexam-areas.js";
import type { Template } from "../../lib/engine/templates/types.js";

describe("pastexam-areas（正準分類）", () => {
  it("PASTEXAM_WINDOW は直近20年 [2006, 2025]", () => {
    expect(PASTEXAM_WINDOW).toEqual([2006, 2025]);
    expect(PASTEXAM_WINDOW[1] - PASTEXAM_WINDOW[0]).toBe(19); // 20年分（両端含む）
  });

  it("trackedSubjects は全6科目を含む", () => {
    const tracked = trackedSubjects();
    for (const s of ["理論", "電力", "機械", "法規", "電力管理", "機械制御"] as Subject[]) {
      expect(tracked, `${s} がタクソノミに登録されている`).toContain(s);
    }
  });

  it("areasForSubject: 全6科目が分野を返し、enum外（未登録）は空配列", () => {
    for (const s of ["理論", "電力", "機械", "法規", "電力管理", "機械制御"] as Subject[]) {
      expect(areasForSubject(s).length, `${s} は分野を持つ`).toBeGreaterThan(0);
    }
    // タクソノミ未登録のキー（防御的フォールバック）→ 空配列
    expect(areasForSubject("未登録科目" as unknown as Subject)).toEqual([]);
  });
});

describe("computeSubjectCoverage（手組みフィクスチャ・全分岐）", () => {
  // 理論の正準分野名を1つ取得（フィクスチャで「カバー済み」を作るため）。
  const knownArea = areasForSubject("理論")[0]?.area as string;

  const fixtures: TemplateLike[] = [
    { topic: "覆う問題", subject: "理論", pastExam: { area: knownArea, frequency: "high" } },
    { topic: "別科目（無視される）", subject: "法規", pastExam: { area: knownArea, frequency: "high" } },
    { topic: "メタ無し問題", subject: "理論" }, // pastExam 無し → templatesWithMeta に数えない
    { topic: "未知area問題", subject: "理論", pastExam: { area: "存在しない分野XYZ", frequency: "low" } },
  ];

  const cov = computeSubjectCoverage("理論", fixtures);

  it("当該科目のテンプレのみ集計する（他科目は除外）", () => {
    expect(cov.templatesTotal).toBe(3); // 理論3件（法規1件は除外）
    expect(cov.templatesWithMeta).toBe(2); // メタ有り2件（覆う問題・未知area問題）
  });

  it("正準分野にマッチした分野が covered になる", () => {
    const target = cov.areas.find((a) => a.area === knownArea);
    expect(target?.covered).toBe(true);
    expect(target?.templateCount).toBe(1);
    expect(target?.topics).toEqual(["覆う問題"]);
  });

  it("未知 area はカバー扱いされず unknownAreaTopics に入る", () => {
    expect(cov.unknownAreaTopics).toContain("未知area問題");
    // 「存在しない分野XYZ」はどの canonical area にも計上されない
    expect(cov.areas.some((a) => a.area === "存在しない分野XYZ")).toBe(false);
  });

  it("coverageRatio は covered/total（0..1）", () => {
    expect(cov.coverageRatio).toBeGreaterThan(0);
    expect(cov.coverageRatio).toBeLessThanOrEqual(1);
    expect(cov.coveredAreas).toBe(1);
    expect(cov.totalAreas).toBe(areasForSubject("理論").length);
  });

  it("タクソノミ未登録の科目は totalAreas=0・ratio=1（防御的フォールバック）", () => {
    // 全6科目が登録済みのため、enum外の値で未登録分岐を検証する。
    const subject = "未登録科目" as unknown as Subject;
    const cov0 = computeSubjectCoverage(subject, [{ topic: "x", subject }]);
    expect(cov0.totalAreas).toBe(0);
    expect(cov0.coverageRatio).toBe(1);
  });

  it("登録科目でテンプレ0件なら coveredAreas=0・ratio=0", () => {
    const empty = computeSubjectCoverage("機械", []);
    expect(empty.totalAreas).toBe(areasForSubject("機械").length);
    expect(empty.coveredAreas).toBe(0);
    expect(empty.coverageRatio).toBe(0);
  });
});

describe("computePastExamCoverage / toTemplateLike", () => {
  it("空配列でも落ちず、追跡科目分の SubjectCoverage を返す", () => {
    const report = computePastExamCoverage([]);
    expect(report.subjects.length).toBe(trackedSubjects().length);
    expect(report.totalTemplates).toBe(0);
    expect(report.templatesWithMeta).toBe(0);
    expect(report.window).toEqual(PASTEXAM_WINDOW);
  });

  it("toTemplateLike: pastExam の有無でキーを出し分ける", () => {
    // 実テンプレ（バックフィル済み）→ pastExam 有り
    const theory = getTemplate("最大電力伝送");
    expect(theory).toBeDefined();
    const withMeta = toTemplateLike(theory!);
    expect(withMeta.pastExam).toBeDefined();

    // メタ未付与テンプレ（全レジストリは付与済みのため擬似 Template で検証）→ キー自体を持たない
    const bare = {
      topic: "メタ無し",
      subject: "機械",
      exam: "denken3",
      difficulty: 1,
      paramSpecs: {},
      generate: () => null,
      generateFrom: () => null,
    } as unknown as Template;
    const noMeta = toTemplateLike(bare);
    expect("pastExam" in noMeta).toBe(false);
  });
});

describe("formatCoverageReport（全分岐を合成レポートで網羅）", () => {
  const report: PastExamCoverageReport = {
    window: [2006, 2025],
    totalTemplates: 5,
    templatesWithMeta: 3,
    overallCoverageRatio: 0.5,
    subjects: [
      {
        subject: "理論",
        totalAreas: 3,
        coveredAreas: 1,
        coverageRatio: 0.33,
        templatesWithMeta: 1,
        templatesTotal: 2,
        uncoveredHighFrequency: ["未カバー頻出"],
        unknownAreaTopics: ["綴り揺れ問題"],
        areas: [
          { area: "覆済", frequency: "high", templateCount: 1, covered: true, topics: ["t1"] },
          { area: "未カバー頻出", frequency: "high", templateCount: 0, covered: false, topics: [] },
          { area: "稀分野", frequency: "low", templateCount: 0, covered: false, topics: [] },
        ],
      },
    ],
  };

  const text = formatCoverageReport(report);

  it("ヘッダ・年スパン・全体行を含む", () => {
    expect(text).toContain("2006–2025");
    expect(text).toContain("追跡科目平均 50%");
    expect(text).toContain("メタ付与 3/5");
  });

  it("カバー済(✓)・未カバー(·)・頻度表記(★毎年/・稀)を出し分ける", () => {
    expect(text).toContain("✓");
    expect(text).toContain("·");
    expect(text).toContain("★毎年");
    expect(text).toContain("・稀"); // low 頻度の分岐
  });

  it("未カバー頻出分野と未知area指定の警告行を出す", () => {
    expect(text).toContain("⚠ 未カバーの頻出分野（優先補強）: 未カバー頻出");
    expect(text).toContain("⚠ 正準分類に無いarea指定: 綴り揺れ問題");
  });

  it("mid 頻度（・数年）も整形できる", () => {
    const midText = formatCoverageReport({
      ...report,
      subjects: [
        {
          ...report.subjects[0]!,
          uncoveredHighFrequency: [],
          unknownAreaTopics: [],
          areas: [{ area: "数年分野", frequency: "mid", templateCount: 1, covered: true, topics: ["m1"] }],
        },
      ],
    });
    expect(midText).toContain("・数年");
  });
});

describe("受入条件: 実レジストリ（全6科目の20年分メタ整備）", () => {
  const registryReport = (): PastExamCoverageReport =>
    computePastExamCoverage(
      listTopics()
        .map((topic) => getTemplate(topic))
        .filter((t): t is NonNullable<typeof t> => t !== undefined)
        .map(toTemplateLike),
    );

  it("全テンプレ（全6科目）に pastExam メタが付与されている", () => {
    const missing: string[] = [];
    for (const topic of listTopics()) {
      const t = getTemplate(topic);
      if (!t) continue;
      if (!t.pastExam) missing.push(`${t.subject}:${topic}`);
    }
    expect(missing, `メタ未付与: ${missing.join(", ")}`).toEqual([]);
  });

  it("全科目の pastExam.area はすべて正準分類に一致する（未知area無し）", () => {
    const report = registryReport();
    for (const s of report.subjects) {
      expect(s.unknownAreaTopics, `${s.subject} に未知area: ${s.unknownAreaTopics.join(", ")}`).toEqual([]);
    }
  });

  it("理論は頻出(high)分野に未カバーが無い", () => {
    const theory = registryReport().subjects.find((s) => s.subject === "理論");
    expect(theory?.uncoveredHighFrequency, "理論の未カバー頻出分野").toEqual([]);
  });

  it("メタ付与は全登録テンプレ（>=90・付与率100%）に及ぶ", () => {
    const report = registryReport();
    expect(report.templatesWithMeta).toBeGreaterThanOrEqual(90);
    expect(report.templatesWithMeta).toBe(report.totalTemplates);
  });

  it("pastExam.years はすべて20年窓 [2006,2025] 内の整数（逐語索引でなく代表年の回帰ガード）", () => {
    const [from, to] = PASTEXAM_WINDOW;
    const offending: string[] = [];
    for (const topic of listTopics()) {
      const years = getTemplate(topic)?.pastExam?.years;
      if (!years) continue;
      for (const y of years) {
        if (!Number.isInteger(y) || y < from || y > to) offending.push(`${topic}:${y}`);
      }
    }
    expect(offending, `窓外/非整数の年度: ${offending.join(", ")}`).toEqual([]);
  });
});
