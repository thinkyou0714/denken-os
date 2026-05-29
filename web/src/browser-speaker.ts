/**
 * browser-speaker.ts — Web Speech API による Speaker 実装（DOM 依存をここに隔離）。
 *
 * OS 内蔵の音声合成を使うため**無料・オフライン**で動く（クラウド TTS のコスト/
 * オンライン依存を避ける設計判断。PWA のバックエンド不要方針に整合）。
 * 日本語音声(ja-JP)を優先選択する。Node/テストからは import されない。
 */
import type { Speaker, SpeakOptions } from "./audio-player.js";

/** この環境で音声合成が使えるか。 */
export function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export class BrowserSpeaker implements Speaker {
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.refreshVoice();
    // 音声リストは非同期で揃うことがあるため、更新イベントで取り直す。
    if (isSpeechAvailable() && typeof speechSynthesis.addEventListener === "function") {
      speechSynthesis.addEventListener("voiceschanged", () => this.refreshVoice());
    }
  }

  private refreshVoice(): void {
    if (!isSpeechAvailable()) return;
    const voices = speechSynthesis.getVoices();
    this.voice = voices.find((v) => v.lang === "ja-JP") ?? voices.find((v) => v.lang.startsWith("ja")) ?? null;
  }

  speak(text: string, opts: SpeakOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      if (!isSpeechAvailable()) {
        resolve();
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts.lang ?? "ja-JP";
      u.rate = opts.rate ?? 1;
      if (this.voice) u.voice = this.voice;
      // 読み終わり・失敗のどちらでも前へ進める（停止しないことを優先）。
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }

  cancel(): void {
    if (isSpeechAvailable()) speechSynthesis.cancel();
  }
}
