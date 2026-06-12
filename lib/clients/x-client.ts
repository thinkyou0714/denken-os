/**
 * x-client.ts — X 投稿クライアントのインターフェース（02 / 03 / 10 の外部I/O境界）。
 *
 * ★重要（調査反映）: X の無料 API 枠は 2026/2 に新規提供終了→従量制。
 *   よって本リポジトリの既定は「実投稿しない＝下書きエクスポート」。
 *   実投稿は正規 X API v2 経由でのみ行い、自動いいね/フォロー/リプは実装しない（凍結要因）。
 *   トークンは env（コミット禁止）。実装は認証取得後（human-tasks.md）に差し込む。
 *
 * タイムアウト/リトライ方針（I-032）:
 *   実 API クライアント（将来実装）が守るべき定数を下記に示す。
 *   - REQUEST_TIMEOUT_MS: 1回あたりの HTTP リクエストタイムアウト（10秒）。
 *     X API v2 は通常 1〜2 秒で応答するが、rate limit 到達時に遅延することがある。
 *   - MAX_RETRIES: 5xx エラー時の再試行上限（2回）。429(rate limit) は再試行しない。
 *     指数バックオフ: 1回目 1s・2回目 2s。3回目以降は失敗として伝播する。
 *   - POLL_DURATION_MINUTES: poll の集計期間。アプリ内の getPollVotes 呼び出し頻度と合わせる。
 */

/** HTTP リクエスト 1 回あたりのタイムアウト（ミリ秒）。 */
export const REQUEST_TIMEOUT_MS = 10_000;
/** 5xx 系エラー時の再試行上限回数（429 rate-limit は再試行しない）。 */
export const MAX_RETRIES = 2;
/** X poll のデフォルト投票受付時間（分）。24時間。 */
export const POLL_DURATION_MINUTES = 24 * 60;

export interface ScheduledPost {
  text: string;
  /** 予約投稿時刻。 */
  scheduledAt: Date;
  /** 任意: アンケート選択肢（03 の集計のため出題に poll を併設）。 */
  poll?: { options: string[]; durationMinutes: number };
  /** 任意: この投稿が引用する元投稿ID（夜解答→朝出題）。 */
  quoteOfId?: string;
}

export interface PostReceipt {
  id: string;
  scheduledAt: Date;
  exported: boolean; // true=下書きエクスポートのみ（未投稿）
}

export interface XClient {
  schedule(post: ScheduledPost): Promise<PostReceipt>;
  /** poll の得票を取得（03 で正答率算出）。実装は API 経由。 */
  getPollVotes?(postId: string): Promise<number[]>;
}

/**
 * 既定実装: 実投稿せず、予約内容を JSONL 風の下書きとして貯める。
 * 公式スケジューラ/手動投稿へ流す前提（凍結回避・コスト回避）。
 */
export class DraftExportClient implements XClient {
  readonly drafts: (ScheduledPost & { id: string })[] = [];
  private seq = 0;

  async schedule(post: ScheduledPost): Promise<PostReceipt> {
    const id = `draft-${++this.seq}`;
    this.drafts.push({ ...post, id });
    return { id, scheduledAt: post.scheduledAt, exported: true };
  }

  /** 下書きを人手投稿用にエクスポート（テキスト連結）。 */
  export(): string {
    return this.drafts.map((d) => `## ${d.scheduledAt.toISOString()} (${d.id})\n${d.text}`).join("\n\n---\n\n");
  }
}
