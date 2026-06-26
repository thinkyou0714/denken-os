import { describe, expect, it } from "vitest";
import {
  type AnswerLog,
  aggregateByTopic,
  smoothedSuccessRate,
  weakestTopics,
  weaknessScore,
} from "../../lib/scheduler/diagnosis.js";

describe("弱点診断", () => {
  it("連続不正解の topic ほど優先度が上がる", () => {
    const now = Date.UTC(2026, 0, 10);
    const logs: AnswerLog[] = [
      // 三相交流電力: 3回中3回不正解 → 弱点
      { topic: "三相交流電力", correct: false, atMs: now },
      { topic: "三相交流電力", correct: false, atMs: now },
      { topic: "三相交流電力", correct: false, atMs: now },
      // 直流回路: 3回中3回正解 → 得意
      { topic: "直流回路", correct: true, atMs: now },
      { topic: "直流回路", correct: true, atMs: now },
      { topic: "直流回路", correct: true, atMs: now },
    ];
    const prog = aggregateByTopic(logs);
    const weak = weakestTopics(prog.values(), now, 2);
    expect(weak[0]).toBe("三相交流電力");
  });

  it("試行1回のミスが、多数試行で確実に弱い論点を上回らない（#58 平滑化）", () => {
    const now = Date.UTC(2026, 0, 10);
    const logs: AnswerLog[] = [
      // 1回だけ挑戦して外した論点（ノイズ。確信度が低い）。
      { topic: "たまたま外した論点", correct: false, atMs: now },
    ];
    // 20回中4回しか正解しない、確実に弱い論点。
    for (let i = 0; i < 20; i++) logs.push({ topic: "本当に弱い論点", correct: i < 4, atMs: now });
    const prog = aggregateByTopic(logs);
    const weak = weakestTopics(prog.values(), now, 2);
    expect(weak[0]).toBe("本当に弱い論点");
  });

  it("smoothedSuccessRate は試行0で事前、試行増で実測へ収束する", () => {
    expect(smoothedSuccessRate(0, 0)).toBeCloseTo(0.6, 5); // 事前
    // 0/1 は事前へ強く寄る（生の0より十分高い）。
    expect(smoothedSuccessRate(0, 1)).toBeGreaterThan(0.3);
    // 多数試行では実測（0.2）に近づく。
    expect(smoothedSuccessRate(4, 20)).toBeLessThan(0.3);
  });

  it("平滑化後も、明確な弱点(0/3)は得意(3/3)より高スコア（順序保存）", () => {
    const now = Date.UTC(2026, 0, 10);
    const weak = weaknessScore({ topic: "w", attempts: 3, correct: 0, dueMs: now }, now);
    const strong = weaknessScore({ topic: "s", attempts: 3, correct: 3, dueMs: now }, now);
    expect(weak).toBeGreaterThan(strong);
  });

  it("試行0（未着手）の論点は、大きく overdue でも実弱点を上回らない（過大評価防止）", () => {
    const now = Date.UTC(2026, 0, 10);
    const day = 86_400_000;
    // 一度も着手していないが due だけ1年超過した論点（学習証拠なし）。
    const untested = weaknessScore({ topic: "u", attempts: 0, correct: 0, dueMs: now - 365 * day }, now);
    // 実際に弱い論点（3回中0正解・5日 overdue）。
    const realWeak = weaknessScore({ topic: "w", attempts: 3, correct: 0, dueMs: now - 5 * day }, now);
    expect(realWeak).toBeGreaterThan(untested);
  });

  it("試行≥1 の overdue 上限は従来どおり30日（較正不変）", () => {
    const now = Date.UTC(2026, 0, 10);
    const day = 86_400_000;
    // attempts≥1 なら overdue 30日と100日でスコアは同じ（両方30でクランプ＝挙動不変）。
    const at30 = weaknessScore({ topic: "a", attempts: 2, correct: 1, dueMs: now - 30 * day }, now);
    const at100 = weaknessScore({ topic: "b", attempts: 2, correct: 1, dueMs: now - 100 * day }, now);
    expect(at30).toBe(at100);
  });

  it("dueMs は並び順に依存せず最新の解答時刻になる", () => {
    const day = 86_400_000;
    const t0 = Date.UTC(2026, 0, 1);
    // わざと新しい→古い→中間の順（order 未指定の DB を模す）。
    const logs: AnswerLog[] = [
      { topic: "機械", correct: false, atMs: t0 + 2 * day },
      { topic: "機械", correct: true, atMs: t0 },
      { topic: "機械", correct: false, atMs: t0 + 1 * day },
    ];
    const prog = aggregateByTopic(logs);
    const m = prog.get("機械")!;
    expect(m.attempts).toBe(3);
    expect(m.dueMs).toBe(t0 + 2 * day); // 配列末尾(t0+1day)ではなく最新
  });
});
