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

// 祝賀の紙吹雪（「紙×朱」の温色パレットに調和: 金・朱・若葉・珊瑚・生成り・琥珀）。
const CONFETTI_COLORS = ["#ffd645", "#e5926f", "#7fc99a", "#ef8f7f", "#f2e3b8", "#dcb04e"];

/** 画面上部から紙吹雪を降らせる（animationend で各 span を個別削除。全消滅後に host も除去）。 */
export function confettiBurst(count = 28): void {
  if (prefersReducedMotion()) return;
  try {
    const host = document.createElement("div");
    host.className = "confetti";
    host.setAttribute("aria-hidden", "true");
    // II-155: 各 span を animationend で削除し、全 span 消滅後に host も除去する。
    // setTimeout フォールバックは animationend 非発火（hidden タブ等）への保険。
    let remaining = count;
    function onEnd(e: Event): void {
      (e.currentTarget as HTMLElement).remove();
      remaining -= 1;
      if (remaining <= 0) host.remove();
    }
    // フォールバックは実際の最大(遅延+継続)から算出する（固定 1900ms は将来の値変更でズレる）。
    let maxEndSec = 0;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      const left = Math.random() * 100;
      const delay = Math.random() * 0.25;
      const dur = 1 + Math.random() * 0.6;
      maxEndSec = Math.max(maxEndSec, delay + dur);
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const rot = Math.floor(Math.random() * 360);
      p.style.cssText = `left:${left}%;background:${color};animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${rot}deg)`;
      p.addEventListener("animationend", onEnd, { once: true });
      host.appendChild(p);
    }
    document.body.appendChild(host);
    // フォールバック: アニメーションが発火しない環境（hidden タブ等）でも確実に除去する。
    // 実測の最大終了時刻に小さな余裕(0.3s)を足してミリ秒へ。
    window.setTimeout(() => host.remove(), Math.ceil((maxEndSec + 0.3) * 1000));
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
type Volume = "off" | "low" | "mid" | "high";

/** 音量レベル → ゲイン。控えめな上限（high でも BGM 程度）。 */
const VOLUME_GAIN: Record<Exclude<Volume, "off">, number> = { low: 0.028, mid: 0.06, high: 0.12 };

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

/** 効果音を鳴らす。volume には設定の SoundLevel をそのまま渡す（"off" なら無音）。 */
export function playTone(kind: ToneKind, volume: Volume | boolean): void {
  // 後方互換: boolean は on=mid / off に写像する。
  const level: Volume = typeof volume === "boolean" ? (volume ? "mid" : "off") : volume;
  if (level === "off") return;
  const c = ctx();
  if (!c) return;
  try {
    const g = VOLUME_GAIN[level];
    const t = c.currentTime;
    if (kind === "correct") {
      beep(c, 660, t, 0.09, g);
      beep(c, 880, t + 0.09, 0.12, g);
    } else if (kind === "wrong") {
      beep(c, 196, t, 0.18, g * 0.85, "triangle");
    } else if (kind === "levelup") {
      beep(c, 523, t, 0.1, g);
      beep(c, 659, t + 0.1, 0.1, g);
      beep(c, 784, t + 0.2, 0.16, g);
      beep(c, 1047, t + 0.32, 0.22, g);
    } else {
      // clear: クエスト/目標達成のファンファーレ（短め）。
      beep(c, 784, t, 0.1, g);
      beep(c, 988, t + 0.1, 0.18, g);
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
