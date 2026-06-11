/**
 * mascot.ts — マスコット「デンタマ」（純ロジック＋インラインSVG）。
 *
 * Duolingo のフクロウが果たす役割の電験版: アプリを「教材」から「相棒」に変える。
 *  - 感情のあるキャラが進捗に反応する（達成を一緒に喜ぶ／ストリークの危機を心配する）と、
 *    無機質な数字より行動が変わる（擬人化ナッジ）。
 *  - メッセージは日替わりで言い回しを変える（毎回同じだと脳が無視する＝慣れ防止）。
 *  - 画像アセットなしのインラインSVG（オフラインPWA・図解と同じ方式・テーマ非依存の配色）。
 * DOM 非依存でテスト可能。
 */
import type { StreakState } from "./retention.js";

export const MASCOT_NAME = "デンタマ";

export type MascotMood = "happy" | "cheer" | "worried" | "sad" | "sleepy";

const MOOD_LABEL: Record<MascotMood, string> = {
  happy: "にこにこ",
  cheer: "大よろこび",
  worried: "しんぱい",
  sad: "しょんぼり",
  sleepy: "おやすみ",
};

/** 表情パーツ（目・口・腕）を気分ごとに差し替える。 */
function face(mood: MascotMood): string {
  switch (mood) {
    case "cheer":
      return (
        `<path d="M21 33 q4 -5 8 0" fill="none" stroke="#5b4300" stroke-width="2.4" stroke-linecap="round"/>` +
        `<path d="M35 33 q4 -5 8 0" fill="none" stroke="#5b4300" stroke-width="2.4" stroke-linecap="round"/>` +
        `<path d="M26 41 q6 9 12 0 z" fill="#a85410"/>`
      );
    case "worried":
      return (
        `<circle cx="25" cy="34" r="2.6" fill="#5b4300"/><circle cx="39" cy="34" r="2.6" fill="#5b4300"/>` +
        `<path d="M21 28 l7 2" stroke="#5b4300" stroke-width="2" stroke-linecap="round"/>` +
        `<path d="M43 28 l-7 2" stroke="#5b4300" stroke-width="2" stroke-linecap="round"/>` +
        `<path d="M27 44 q2.5 -3 5 0 q2.5 3 5 0" fill="none" stroke="#5b4300" stroke-width="2.2" stroke-linecap="round"/>` +
        `<path d="M47 36 q2 3 0 5 q-2 -2 0 -5" fill="#7cc4ff"/>`
      );
    case "sad":
      return (
        `<circle cx="25" cy="34" r="2.6" fill="#5b4300"/><circle cx="39" cy="34" r="2.6" fill="#5b4300"/>` +
        `<path d="M27 46 q5 -5 10 0" fill="none" stroke="#5b4300" stroke-width="2.2" stroke-linecap="round"/>` +
        `<ellipse cx="22" cy="40" rx="1.6" ry="2.6" fill="#7cc4ff"/>`
      );
    case "sleepy":
      return (
        `<path d="M22 34 h6 M36 34 h6" stroke="#5b4300" stroke-width="2.4" stroke-linecap="round"/>` +
        `<circle cx="32" cy="44" r="2" fill="#a85410"/>` +
        `<text x="48" y="22" font-size="9" fill="#5b4300" font-weight="700">z</text>` +
        `<text x="53" y="15" font-size="7" fill="#5b4300" font-weight="700">z</text>`
      );
    default:
      return (
        `<circle cx="25" cy="34" r="2.6" fill="#5b4300"/><circle cx="39" cy="34" r="2.6" fill="#5b4300"/>` +
        `<path d="M27 42 q5 5 10 0" fill="none" stroke="#5b4300" stroke-width="2.2" stroke-linecap="round"/>`
      );
  }
}

function arms(mood: MascotMood): string {
  if (mood === "cheer") {
    // 両腕を上げて万歳。
    return (
      `<path d="M13 31 q-6 -5 -4 -12" fill="none" stroke="#e3a400" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M51 31 q6 -5 4 -12" fill="none" stroke="#e3a400" stroke-width="4" stroke-linecap="round"/>`
    );
  }
  return (
    `<path d="M13 38 q-4 2 -5 6" fill="none" stroke="#e3a400" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M51 38 q4 2 5 6" fill="none" stroke="#e3a400" stroke-width="4" stroke-linecap="round"/>`
  );
}

/**
 * デンタマのSVG（電気の玉の妖精。稲妻のアホ毛がトレードマーク）。
 * 文字列を `figure`/`div` の innerHTML として使う（自前生成・信頼済み）。
 */
export function mascotSvg(mood: MascotMood, size = 72): string {
  return (
    `<svg viewBox="0 0 64 64" width="${size}" height="${size}" role="img" ` +
    `aria-label="${MASCOT_NAME}（${MOOD_LABEL[mood]}）">` +
    arms(mood) +
    `<circle cx="32" cy="36" r="21" fill="#ffd645" stroke="#e3a400" stroke-width="2"/>` +
    `<path d="M34 4 L27 17 L32 17 L29 27 L40 13 L34.5 13 Z" fill="#ffb300" stroke="#e3a400" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<ellipse cx="24" cy="27" rx="5" ry="2.6" fill="#fff" opacity=".55"/>` +
    `<ellipse cx="19.5" cy="40" rx="3.2" ry="2" fill="#ff9d9d" opacity=".75"/>` +
    `<ellipse cx="44.5" cy="40" rx="3.2" ry="2" fill="#ff9d9d" opacity=".75"/>` +
    face(mood) +
    `<ellipse cx="25" cy="56.5" rx="4" ry="2" fill="#e3a400"/>` +
    `<ellipse cx="39" cy="56.5" rx="4" ry="2" fill="#e3a400"/>` +
    `</svg>`
  );
}

export interface MascotContext {
  streakState: StreakState;
  streakDays: number;
  todayCount: number;
  dailyGoal: number;
  /** 今日出す復習の件数（0なら言及しない）。 */
  dueCount: number;
  /** メッセージの言い回しローテーション用（JST 日番号など）。 */
  dayIndex: number;
}

export interface MascotView {
  mood: MascotMood;
  message: string;
}

/** 配列から日替わりで1つ選ぶ（同じ日は同じ文言＝安定、翌日は変わる＝慣れ防止）。 */
function pick(variants: readonly string[], seed: number): string {
  return variants[Math.abs(seed) % variants.length]!;
}

/** ホーム（学習タブ）でのデンタマの一言。状況に応じて表情と台詞が変わる。 */
export function mascotHome(ctx: MascotContext): MascotView {
  const { streakState, streakDays, todayCount, dailyGoal, dueCount, dayIndex } = ctx;
  if (streakState === "none") {
    return {
      mood: "happy",
      message: `はじめまして、${MASCOT_NAME}だよ！⚡ まずは1問、いっしょにやってみよう！`,
    };
  }
  if (streakState === "broken") {
    return {
      mood: "sad",
      message: pick(
        [
          "おかえり！会いたかったよ。軽い1問から再開しよう⚡",
          "また会えてうれしい！今日から新しい炎を育てよう🔥",
          "ブランクは気にしない！戻ってきたキミがえらい！",
        ],
        dayIndex,
      ),
    };
  }
  if (streakState === "at-risk") {
    return {
      mood: "worried",
      message: pick(
        [
          `🔥${streakDays}日の炎が消えちゃう…！1問だけでもやろう？`,
          `今日まだ0問だよ…3分だけ、ね？ ${streakDays}日連続を守ろう！`,
          `ストリークがピンチ！キミの${streakDays}日を無駄にしたくないんだ。`,
        ],
        dayIndex,
      ),
    };
  }
  if (todayCount >= dailyGoal) {
    return {
      mood: "cheer",
      message: pick(
        [
          "今日の目標達成！キミ、ほんとにすごいよ🎉",
          "やりきったね！明日もボクと続けよう⚡",
          "目標クリア！この積み重ねが合格をつくるんだ✨",
        ],
        dayIndex,
      ),
    };
  }
  const remain = Math.max(1, dailyGoal - todayCount);
  if (dueCount > 0) {
    return {
      mood: "happy",
      message: pick(
        [
          `復習が ${dueCount} 件待ってるよ。忘れる前が勝負！`,
          `今日あと ${remain} 問！まず復習 ${dueCount} 件から片付けよう。`,
          `復習 ${dueCount} 件→新しい問題、の順がオススメだよ⚡`,
        ],
        dayIndex,
      ),
    };
  }
  return {
    mood: "happy",
    message: pick(
      [
        `今日あと ${remain} 問で目標達成！いいペース⚡`,
        `あと ${remain} 問！コツコツが合格への最短ルートだよ。`,
        `調子いいね！あと ${remain} 問、いってみよう！`,
      ],
      dayIndex,
    ),
  };
}

/** 解答直後のリアクション（正誤とコンボで変わる短い一言）。 */
export function mascotCheer(correct: boolean, combo: number, seed = 0): string {
  if (!correct) {
    return pick(
      ["ドンマイ！間違いは伸びしろだよ", "ここで覚えれば本番で勝てる！", "解説を読んだら、もう一歩前進！"],
      seed,
    );
  }
  if (combo >= 5) return `⚡${combo}コンボ！神がかってる！`;
  if (combo >= 3) return `⚡${combo}コンボ！ノってるね！`;
  return pick(["やったね！", "その調子！", "ナイス！⚡"], seed + combo);
}
