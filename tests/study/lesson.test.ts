import { describe, expect, it } from "vitest";
import type { Problem, Subject } from "../../lib/engine/schema.js";
import {
  buildLesson,
  lessonFeedback,
  PASS_LINE,
  passReadiness,
  type QuizResult,
  summarizeLesson,
} from "../../lib/study/lesson.js";

function mk(id: string, subject: Subject, topic: string): Problem {
  return {
    id,
    subject,
    topic,
    difficulty: 1,
    statement: `${topic}の問題`,
    answer: "1",
    choices: ["1", "2"],
    format: "multiple_choice",
    solution: ["手順"],
    validation: { solver_checked: true, human_checked: true, clean_answer: true, physically_valid: true },
    source: { type: "original", citation: "t" },
  } as Problem;
}

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

const pool = [
  mk("a", "法規", "B種接地抵抗"),
  mk("b", "法規", "低圧電路の絶縁抵抗"),
  mk("c", "理論", "三相交流電力"),
  mk("d", "機械", "誘導電動機の回転速度"),
];

describe("buildLesson — 聞く→解く", () => {
  it("listen と quiz は同じ集合（聞いた論点をそのまま出題）", () => {
    const { listen, quiz } = buildLesson(pool, { count: 3, rng: seededRng(1) });
    expect(listen.length).toBe(3);
    expect(quiz.length).toBe(3);
    expect(quiz.map((p) => p.id).sort()).toEqual(listen.map((p) => p.id).sort());
  });

  it("科目で絞れる", () => {
    const { listen } = buildLesson(pool, { subjects: ["法規"], count: 5, rng: seededRng(2) });
    expect(listen.every((p) => p.subject === "法規")).toBe(true);
    expect(listen.length).toBe(2);
  });

  it("count で問題数を制限する", () => {
    expect(buildLesson(pool, { count: 2, rng: seededRng(3) }).listen.length).toBe(2);
  });
});

describe("summarizeLesson — 合格ロジック", () => {
  const results = (pattern: boolean[]): QuizResult[] =>
    pattern.map((correct, i) => ({ topic: `T${i}`, subject: "法規" as Subject, correct }));

  it("正答率と合格ライン(60%)到達を判定する", () => {
    const s = summarizeLesson(results([true, true, true, false, false])); // 3/5=60%
    expect(s.accuracy).toBeCloseTo(0.6);
    expect(s.reachedPassLine).toBe(true);
    expect(s.toPass).toBe(0);
  });

  it("合格ライン未満なら不足問数を出す", () => {
    const s = summarizeLesson(results([true, false, false, false, false])); // 1/5=20%
    expect(s.reachedPassLine).toBe(false);
    expect(s.toPass).toBe(2); // ceil(0.6*5)=3, 3-1=2
  });

  it("弱点 topic を低正答率順に最大3件返す", () => {
    const rs: QuizResult[] = [
      { topic: "弱1", subject: "法規", correct: false },
      { topic: "弱2", subject: "法規", correct: false },
      { topic: "弱3", subject: "理論", correct: false },
      { topic: "得意", subject: "機械", correct: true },
    ];
    const s = summarizeLesson(rs);
    expect(s.weakestTopics).toEqual(["弱1", "弱2", "弱3"]);
    expect(s.weakestTopics).not.toContain("得意");
  });

  it("科目別正答率を弱点順に出す", () => {
    const rs: QuizResult[] = [
      { topic: "x", subject: "法規", correct: false },
      { topic: "y", subject: "理論", correct: true },
    ];
    const s = summarizeLesson(rs);
    expect(s.bySubject[0]!.subject).toBe("法規"); // 0% が先頭
  });

  it("空でも安全（0%）", () => {
    const s = summarizeLesson([]);
    expect(s.total).toBe(0);
    expect(s.accuracy).toBe(0);
    expect(s.reachedPassLine).toBe(false);
  });
});

describe("lessonFeedback — 講評", () => {
  it("合格ライン超えはポジティブな講評", () => {
    const fb = lessonFeedback(summarizeLesson([{ topic: "x", subject: "法規", correct: true }]));
    expect(fb).toContain("合格ライン");
    expect(fb).toContain("超えて");
  });

  it("未達は不足問数と弱点と次アクションを示す", () => {
    const fb = lessonFeedback(
      summarizeLesson([
        { topic: "弱点A", subject: "法規", correct: false },
        { topic: "弱点B", subject: "法規", correct: false },
      ]),
    );
    expect(fb).toContain("あと");
    expect(fb).toContain("弱点A");
    expect(fb).toContain("弱点モード");
  });
});

describe("passReadiness — 科目別合格到達度", () => {
  it("60%以上は onTrack、試行不足は enoughData=false", () => {
    const r = passReadiness([
      { subject: "法規", accuracy: 0.8, attempts: 10 },
      { subject: "理論", accuracy: 0.5, attempts: 3 },
    ]);
    expect(r[0]).toMatchObject({ subject: "法規", onTrack: true, enoughData: true });
    expect(r[1]).toMatchObject({ subject: "理論", onTrack: false, enoughData: false });
  });

  it("PASS_LINE は 0.6", () => {
    expect(PASS_LINE).toBe(0.6);
  });
});
