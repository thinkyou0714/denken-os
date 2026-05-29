/**
 * x-client.ts — X 投稿クライアントのインターフェース（02 / 03 / 10 の外部I/O境界）。
 *
 * ★重要（調査反映）: X の無料 API 枠は 2026/2 に新規提供終了→従量制。
 *   よって本リポジトリの既定は「実投稿しない＝下書きエクスポート」。
 *   実投稿は正規 X API v2 経由でのみ行い、自動いいね/フォロー/リプは実装しない（凍結要因）。
 *   トークンは env（コミット禁止）。実装は認証取得後（human-tasks.md）に差し込む。
 */

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
