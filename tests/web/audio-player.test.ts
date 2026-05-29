import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { AudioPlayer, type Speaker } from "../../web/src/audio-player.js";

/** 発話テキストを記録するだけの Speaker（SpeechSynthesis 不要でテスト可能）。 */
class FakeSpeaker implements Speaker {
  spoken: string[] = [];
  canceled = 0;
  async speak(text: string): Promise<void> {
    this.spoken.push(text);
  }
  cancel(): void {
    this.canceled += 1;
  }
}

const immediateSleep = (): Promise<void> => Promise.resolve();

function mk(id: string, topic: string, subject: Problem["subject"]): Problem {
  return {
    id,
    subject,
    topic,
    difficulty: 1,
    statement: `${topic}の問題`,
    answer: "1",
    solution: ["手順1"],
    validation: { solver_checked: true, human_checked: true, clean_answer: true, physically_valid: true },
    source: { type: "original", citation: "t" },
  } as Problem;
}

describe("AudioPlayer — 聞き流し再生", () => {
  it("1問を台本順（intro→question→gap→answer→explanation）で読み上げる", async () => {
    const speaker = new FakeSpeaker();
    const p = mk("a", "B種接地抵抗", "法規");
    const player = new AudioPlayer([p], speaker, { sleep: immediateSleep });
    await player.playScript(p);
    expect(speaker.spoken.length).toBe(5); // 選択肢なし
    expect(speaker.spoken[0]).toContain("法規");
    expect(speaker.spoken[1]).toContain("問題");
    expect(speaker.spoken).toContain("では、答えを考えてください。");
    expect(speaker.spoken.some((t) => t.startsWith("正解は"))).toBe(true);
  });

  it("start() は全問を連続再生し onProblem を都度呼ぶ", async () => {
    const speaker = new FakeSpeaker();
    const done: string[] = [];
    const problems = [mk("a", "B種接地抵抗", "法規"), mk("b", "低圧電路の絶縁抵抗", "法規")];
    const player = new AudioPlayer(problems, speaker, {
      sleep: immediateSleep,
      loop: false,
      onProblem: ({ problem }) => done.push(problem.id),
    });
    await player.start();
    expect(done).toEqual(["a", "b"]);
    expect(player.isPlaying).toBe(false);
  });

  it("科目フィルタで再生対象を絞る", () => {
    const speaker = new FakeSpeaker();
    const problems = [mk("a", "B種接地抵抗", "法規"), mk("b", "三相交流電力", "理論")];
    const player = new AudioPlayer(problems, speaker, { sleep: immediateSleep }, { subjects: ["法規"] });
    expect(player.length).toBe(1);
  });

  it("stop() は発話をキャンセルする", () => {
    const speaker = new FakeSpeaker();
    const player = new AudioPlayer([mk("a", "B種接地抵抗", "法規")], speaker, { sleep: immediateSleep });
    player.stop();
    expect(speaker.canceled).toBeGreaterThan(0);
    expect(player.isPlaying).toBe(false);
  });
});
