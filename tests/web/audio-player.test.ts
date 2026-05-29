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

  it("maxItems で件数スリープタイマーが働く", async () => {
    const speaker = new FakeSpeaker();
    const done: string[] = [];
    const problems = [mk("a", "T1", "法規"), mk("b", "T2", "法規"), mk("c", "T3", "法規")];
    const player = new AudioPlayer(problems, speaker, {
      sleep: immediateSleep,
      maxItems: 2,
      onProblem: ({ problem }) => done.push(problem.id),
    });
    await player.start();
    expect(done).toEqual(["a", "b"]); // 3問目には進まない
  });

  it("pause()/resume() で一時停止状態を切り替える", () => {
    const player = new AudioPlayer([mk("a", "T1", "法規")], new FakeSpeaker(), { sleep: immediateSleep });
    player.pause();
    expect(player.isPaused).toBe(true);
    player.resume();
    expect(player.isPaused).toBe(false);
  });

  it("maxMs で時間スリープタイマーが働く", async () => {
    let t = 0;
    const now = () => t++; // 呼ぶたびに +1
    const done: string[] = [];
    const problems = [mk("a", "T1", "法規"), mk("b", "T2", "法規"), mk("c", "T3", "法規")];
    const player = new AudioPlayer(problems, new FakeSpeaker(), {
      sleep: immediateSleep,
      maxMs: 2,
      now,
      onProblem: ({ problem }) => done.push(problem.id),
    });
    await player.start();
    expect(done).toEqual(["a"]); // 経過2で停止
  });

  it("startIndex で続きから再生する（レジューム）", async () => {
    const done: string[] = [];
    const problems = [mk("a", "T1", "法規"), mk("b", "T2", "法規"), mk("c", "T3", "法規")];
    const player = new AudioPlayer(problems, new FakeSpeaker(), {
      sleep: immediateSleep,
      startIndex: 1,
      onProblem: ({ problem }) => done.push(problem.id),
    });
    await player.start();
    expect(done).toEqual(["b", "c"]);
  });

  it("終端到達後に再度 start() すると先頭から再生する", async () => {
    let done: string[] = [];
    const problems = [mk("a", "T1", "法規"), mk("b", "T2", "法規")];
    const player = new AudioPlayer(problems, new FakeSpeaker(), {
      sleep: immediateSleep,
      onProblem: ({ problem }) => done.push(problem.id),
    });
    await player.start();
    done = [];
    await player.start();
    expect(done).toEqual(["a", "b"]);
  });

  it("onComplete は完了情報（completed/played）を伴って呼ばれる", async () => {
    const calls: Array<{ completed: boolean; played: number }> = [];
    const problems = [mk("a", "T1", "法規"), mk("b", "T2", "法規")];
    const player = new AudioPlayer(problems, new FakeSpeaker(), {
      sleep: immediateSleep,
      onComplete: (info) => calls.push(info),
    });
    await player.start();
    expect(calls).toEqual([{ completed: true, played: 2 }]); // 末尾到達=completed
  });
});
