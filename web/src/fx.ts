/**
 * fx.ts — 演出（紙吹雪・XPフロート・効果音・ハプティクス）。
 *
 * 「やってて楽しい」の正体は、行動への即時フィードバック（ゲームデザインで言う juice）。
 *  - 紙吹雪: 目標達成・レベルアップ・実績解除などの節目だけに使う（乱発すると報酬価値が下がる）。
 *  - 効果音: WebAudio の合成音（アセット不要・オフライン動作）。設定でオフにできる。
 *  - すべて失敗してもアプリ本体に影響しない（try/catch・存在チェック）。
 *  - prefers-reduced-motion を尊重し、動きを抑えた環境では視覚演出を出さない。
 * DOM/Audio に依存するため app.ts と同様にテスト対象外の薄い層に保つ。
 */

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const CONFETTI_COLORS = ["#ffd645", "#5d83f7", "#34d399", "#f87171", "#f0a4f7", "#7cc4ff"];

/** 画面上部から紙吹雪を降らせる（約1.6秒で自動消滅）。 */
export function confettiBurst(count = 28): void {
  if (prefersReducedMotion()) return;
  try {
    const host = document.createElement("div");
    host.className = "confetti";
    host.setAttribute("aria-hidden", "true");
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      const left = Math.random() * 100;
      const delay = Math.random() * 0.25;
      const dur = 1 + Math.random() * 0.6;
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const rot = Math.floor(Math.random() * 360);
      p.style.cssText = `left:${left}%;background:${color};animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${rot}deg)`;
      host.appendChild(p);
    }
    document.body.appendChild(host);
    window.setTimeout(() => host.remove(), 1900);
  } catch {
    // 演出は失敗しても学習を止めない。
  }
}

/** 「+12 XP」のような獲得フロート表示を host 内に出す。 */
export function xpFloat(host: HTMLElement, text: string): void {
  if (prefersReducedMotion()) return;
  try {
    const el = document.createElement("span");
    el.className = "xpfloat";
    el.textContent = text;
    host.appendChild(el);
    window.setTimeout(() => el.remove(), 1400);
  } catch {
    // noop
  }
}

// ---- 効果音（WebAudio 合成。アセット不要） ----

type ToneKind = "correct" | "wrong" | "levelup" | "clear";

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function beep(
  c: AudioContext,
  freq: number,
  startAt: number,
  dur: number,
  gain = 0.06,
  type: OscillatorType = "sine",
): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(gain, startAt + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
  osc.connect(g).connect(c.destination);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.02);
}

/** 効果音を鳴らす（enabled=false なら無音）。短い合成音のみ・音量控えめ。 */
export function playTone(kind: ToneKind, enabled: boolean): void {
  if (!enabled) return;
  const c = ctx();
  if (!c) return;
  try {
    const t = c.currentTime;
    if (kind === "correct") {
      beep(c, 660, t, 0.09);
      beep(c, 880, t + 0.09, 0.12);
    } else if (kind === "wrong") {
      beep(c, 196, t, 0.18, 0.05, "triangle");
    } else if (kind === "levelup") {
      beep(c, 523, t, 0.1);
      beep(c, 659, t + 0.1, 0.1);
      beep(c, 784, t + 0.2, 0.16);
      beep(c, 1047, t + 0.32, 0.22);
    } else {
      // clear: クエスト/目標達成のファンファーレ（短め）。
      beep(c, 784, t, 0.1);
      beep(c, 988, t + 0.1, 0.18);
    }
  } catch {
    // noop
  }
}

/** ハプティクス（対応端末のみ・短い振動）。 */
export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // noop
  }
}
