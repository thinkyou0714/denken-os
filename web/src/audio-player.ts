/**
 * audio-player.ts — 聞き流し再生のオーケストレーション（DOM 非依存・テスト可能）。
 *
 * 実際の音声合成は Speaker インターフェース越しに行う（store.ts の StorageLike と同じ
 * 注入パターン）。これにより SpeechSynthesis 無しの Node 環境でも単体テストできる。
 * DOM/Web Speech 実装は browser-speaker.ts に隔離する。
 */
import {
  type AudioScript,
  type AudioScriptOptions,
  buildPlaylist,
  type PlaylistOptions,
  toAudioScript,
} from "../../lib/audio/script.js";
import type { Problem } from "../../lib/engine/schema.js";

export interface SpeakOptions {
  rate?: number;
  lang?: string;
}

/** 音声合成の最小インターフェース。speak は読み終わり(or 中断)で解決する。 */
export interface Speaker {
  speak(text: string, opts?: SpeakOptions): Promise<void>;
  cancel(): void;
}

export interface AudioPlayerOptions {
  /** 無音待ちの実装（既定 setTimeout）。テストで即時化できる。 */
  sleep?: (ms: number) => Promise<void>;
  /** 読み上げ速度(0.5〜2.0 目安)。 */
  rate?: number;
  /** 言語。既定 ja-JP。 */
  lang?: string;
  /** 末尾まで行ったら先頭へ戻り連続再生するか。 */
  loop?: boolean;
  /** 台本生成オプション（考える間・解説有無など）。 */
  script?: AudioScriptOptions;
  /** 区間が切り替わるたびに呼ばれる（UI 更新用）。 */
  onSegment?: (info: { script: AudioScript; segmentIndex: number; problemIndex: number }) => void;
  /** 1問の再生が終わるたびに呼ばれる。 */
  onProblem?: (info: { problem: Problem; problemIndex: number }) => void;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * 与えた問題列を「出題→考える間→正解→解説」で順に読み上げる。
 * stop() / next() で中断・スキップできる。
 */
export class AudioPlayer {
  private playlist: Problem[];
  private index = 0;
  private aborted = false;
  private running = false;
  private skip = false;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly rate: number;
  private readonly lang: string;

  constructor(
    problems: Problem[],
    private speaker: Speaker,
    private opts: AudioPlayerOptions = {},
    playlistOpts: PlaylistOptions = {},
  ) {
    this.playlist = buildPlaylist(problems, playlistOpts);
    this.sleep = opts.sleep ?? defaultSleep;
    this.rate = opts.rate ?? 1;
    this.lang = opts.lang ?? "ja-JP";
  }

  get length(): number {
    return this.playlist.length;
  }

  get isPlaying(): boolean {
    return this.running;
  }

  /** 1問ぶんの台本を読み上げる。中断(abort/skip)時は途中で返る。 */
  async playScript(problem: Problem, problemIndex = 0): Promise<void> {
    const script = toAudioScript(problem, this.opts.script);
    for (let i = 0; i < script.segments.length; i++) {
      if (this.aborted || this.skip) return;
      const seg = script.segments[i]!;
      this.opts.onSegment?.({ script, segmentIndex: i, problemIndex });
      await this.speaker.speak(seg.text, { rate: this.rate, lang: this.lang });
      if (this.aborted || this.skip) return;
      if (seg.pauseMsAfter > 0) await this.sleep(seg.pauseMsAfter);
    }
  }

  /** 先頭(または現在位置)から連続再生する。 */
  async start(): Promise<void> {
    if (this.running || this.playlist.length === 0) return;
    this.running = true;
    this.aborted = false;
    do {
      while (this.index < this.playlist.length && !this.aborted) {
        this.skip = false;
        const problem = this.playlist[this.index]!;
        await this.playScript(problem, this.index);
        if (this.aborted) break;
        this.opts.onProblem?.({ problem, problemIndex: this.index });
        this.index += 1;
      }
      if (this.opts.loop && !this.aborted) this.index = 0;
    } while (this.opts.loop && !this.aborted);
    this.running = false;
  }

  /** 再生を止める（現在の発話もキャンセル）。 */
  stop(): void {
    this.aborted = true;
    this.running = false;
    this.speaker.cancel();
  }

  /** 次の問題へスキップする。 */
  next(): void {
    this.skip = true;
    this.speaker.cancel();
  }

  /** 再生位置をリセットする。 */
  reset(): void {
    this.index = 0;
  }
}
