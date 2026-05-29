/**
 * card-text.ts — 学習記録シェアの投稿テキスト生成（06-share-card-generator の純粋部分）。
 * 画像生成自体は Next.js/Satori 段階に委ねる（重いネイティブ依存を避ける）。ここは
 * 「投稿テキスト雛形」を作る純関数。個人情報は載せない／URLは本文に貼らない。
 */

export type CardKind = "streak" | "daily" | "weekly";

export interface StudyRecord {
  /** 表示名（任意のニックネーム。本名・メール等は載せない）。 */
  nickname?: string;
  streakDays: number;
  todayMinutes: number;
  weeklyMinutes: number;
  correctRate?: number; // 0..1
}

const URL_RE = /(https?:\/\/|www\.)\S+/i;

export function cardText(kind: CardKind, r: StudyRecord): string {
  const who = r.nickname ? `${r.nickname} ` : "";
  let body: string;
  switch (kind) {
    case "streak":
      body = `${who}学習${r.streakDays}日連続🔥 今日も電験二種に前進。`;
      break;
    case "daily":
      body = `${who}今日の学習: ${r.todayMinutes}分${r.correctRate !== undefined ? ` / 正答率${Math.round(r.correctRate * 100)}%` : ""}。`;
      break;
    case "weekly":
      body = `${who}今週の学習: ${r.weeklyMinutes}分（${r.streakDays}日継続）。来週も走る。`;
      break;
  }
  const text = `${body}\n#今日のDENKEN #電験二種`;
  if (URL_RE.test(text)) throw new Error("シェアカード本文に URL を含めないでください");
  return text;
}

/** 共有テキストに個人特定情報が含まれていないかの簡易チェック（メール/電話）。 */
export function hasPii(text: string): boolean {
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  const phone = /\b0\d{1,4}-?\d{1,4}-?\d{3,4}\b/;
  return email.test(text) || phone.test(text);
}
