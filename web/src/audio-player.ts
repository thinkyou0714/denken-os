/**
 * audio-player.ts — 聞き流し再生のオーケストレーション（DOM 非依存・テスト可能）。
 *
 * 実際の音声合成は Speaker インターフェース越しに行う（store.ts の StorageLike と同じ
 * 注入パターン）。これにより SpeechSynthesis 無しの Node 環境でも単体テストできる。
 * DOM/Web Speech 実装は browser-speaker.ts に隔離する。
 *
 * 対応操作: 再生/一時停止/再開/停止/次へ/前へ/現在をリピート/指定位置へジャンプ、
 *           連続再生(loop)、件数スリープタイマー(maxItems)。
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
  /** この件数を読み終えたら停止する（件数スリープタイマー）。 */
  maxItems?: number;
  /** この経過時間(ms)で停止する（時間スリープタイマー）。 */
  maxMs?: number;
  /** 現在時刻取得（既定 Date.now）。時間タイマーのテスト用に注入可能。 */
  now?: () => number;
  /** 再生開始位置（レジューム）。 */
  startIndex?: number;
  /** 台本生成オプション（考える間・解説有無など）。 */
  script?: AudioScriptOptions;
  /** 区間が切り替わるたびに呼ばれる（UI 更新・字幕用）。 */
  onSegment?: (info: { script: AudioScript; segmentIndex: number; problemIndex: number }) => void;
  /** 1問の再生が終わるたびに呼ばれる。 */
  onProblem?: (info: { problem: Problem; problemIndex: number }) => void;
  /** 全再生が終了/停止したときに呼ばれる。 */
  onComplete?: () => void;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * 与えた問題列を「出題→考える間→正解→解説」で順に読み上げる。
 */
export class AudioPlayer {
  private playlist: Problem[];
  private index = 0;
  private aborted = false;
  private running = false;
  private paused = false;
  private skip = false;
  private repeatOnce = false;
  private pendingIndex: number | null = null;
  private resumeWaiters: Array<() => void> = [];
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
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
    this.now = opts.now ?? (() => Date.now());
    this.rate = opts.rate ?? 1;
    this.lang = opts.lang ?? "ja-JP";
    if (opts.startIndex && opts.startIndex > 0 && opts.startIndex < this.playlist.length) {
      this.index = opts.startIndex;
    }
  }

  get length(): number {
    return this.playlist.length;
  }

  get isPlaying(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get currentIndex(): number {
    return this.index;
  }

  /** 一時停止が解除されるまで待つ。 */
  private async waitWhilePaused(): Promise<void> {
    while (this.paused && !this.aborted) {
      await new Promise<void>((r) => this.resumeWaiters.push(r));
    }
  }

  /** 1問ぶんの台本を読み上げる。中断(abort/skip/pause)を尊重する。 */
  async playScript(problem: Problem, problemIndex = 0): Promise<void> {
    const script = toAudioScript(problem, this.opts.script);
    for (let i = 0; i < script.segments.length; i++) {
      await this.waitWhilePaused();
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
    // 再生終端を過ぎていたら先頭へ（再スタート時の空振り防止）。
    if (this.index >= this.playlist.length) this.index = 0;
    let played = 0;
    const startedAt = this.now();
    do {
      while (this.index >= 0 && this.index < this.playlist.length && !this.aborted) {
        if (this.opts.maxItems && played >= this.opts.maxItems) {
          this.aborted = true;
          break;
        }
        if (this.opts.maxMs && this.now() - startedAt >= this.opts.maxMs) {
          this.aborted = true;
          break;
        }
        this.skip = false;
        this.repeatOnce = false;
        this.pendingIndex = null;
        const problem = this.playlist[this.index]!;
        await this.playScript(problem, this.index);
        if (this.aborted) break;
        this.opts.onProblem?.({ problem, problemIndex: this.index });
        played += 1;
        if (this.pendingIndex !== null) this.index = this.pendingIndex;
        else if (!this.repeatOnce) this.index += 1;
      }
      if (this.opts.loop && !this.aborted) this.index = 0;
    } while (this.opts.loop && !this.aborted);
    this.running = false;
    this.opts.onComplete?.();
  }

  /** 一時停止（現在の発話も止める。再開で次区間から続行）。 */
  pause(): void {
    this.paused = true;
    this.speaker.cancel();
  }

  /** 再開。 */
  resume(): void {
    this.paused = false;
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    for (const r of waiters) r();
  }

  /** 再生を止める。 */
  stop(): void {
    this.aborted = true;
    this.running = false;
    this.resume(); // 一時停止待ちを解放してループを終わらせる
    this.speaker.cancel();
  }

  /** 次の問題へ。 */
  next(): void {
    this.skip = true;
    this.speaker.cancel();
  }

  /** 前の問題へ。 */
  prev(): void {
    this.pendingIndex = Math.max(0, this.index - 1);
    this.skip = true;
    this.speaker.cancel();
  }

  /** 現在の問題をもう一度。 */
  repeat(): void {
    this.repeatOnce = true;
    this.pendingIndex = this.index;
    this.skip = true;
    this.speaker.cancel();
  }

  /** 指定位置へジャンプ。 */
  jumpTo(index: number): void {
    if (index < 0 || index >= this.playlist.length) return;
    this.pendingIndex = index;
    this.skip = true;
    this.speaker.cancel();
  }

  /** 再生位置をリセットする。 */
  reset(): void {
    this.index = 0;
  }
}
