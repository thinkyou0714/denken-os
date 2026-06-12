/**
 * publish.ts — 出題の予約オーケストレーション（02-xpost-scheduler の配線）。
 * buildXPosts(スレッド) ＋ morningPoll ＋ scheduleFor(ジッター) ＋ XClient を束ね、
 * 朝（poll併設）→夜（朝を引用）の予約を作る。既定の XClient は下書きエクスポート。
 * 03 の正答率集計は poll を一次ソースにするため、朝に必ず poll を併設する。
 */
import { DraftExportClient, type PostReceipt, type XClient } from "../../clients/x-client.js";
import { meetsValidationGate } from "../gate.js";
import type { Problem } from "../schema.js";
import { buildXPosts, morningPoll, scheduleFor } from "./toXPost.js";

export interface PublishOptions {
  client?: XClient;
  day?: Date;
  rng?: () => number;
  correctRate?: number;
}

export interface PublishResult {
  morning: PostReceipt[];
  evening: PostReceipt[];
  /** poll を併設したか（multiple_choice なら true）。 */
  hasPoll: boolean;
}

/**
 * 1問を朝/夜スレッドとして予約する。
 * - 朝スレッドの先頭ポストに poll を併設（03 集計の一次ソース）。
 * - 夜スレッドの先頭は朝先頭ポストを引用（quoteOfId）してツリー化。
 */
export async function scheduleProblem(p: Problem, opts: PublishOptions = {}): Promise<PublishResult> {
  // 公開ゲート（最優先原則「間違った問題を絶対に出さない」/ 09-ci-quality-gate）。
  // 検証4項目が揃わない、または取り下げ済みの問題は fail-closed で投稿させない。
  if (p.status === "retracted") {
    throw new Error(`公開ゲート不通過: ${p.id} は status=retracted のため投稿しません。`);
  }
  if (!meetsValidationGate(p.validation)) {
    throw new Error(
      `公開ゲート不通過: ${p.id} は検証4項目(solver_checked/human_checked/clean_answer/physically_valid)が揃っていません。`,
    );
  }

  const client = opts.client ?? new DraftExportClient();
  const rng = opts.rng ?? Math.random;
  const day = opts.day ?? new Date();

  const posts = buildXPosts(p, { rng, ...(opts.correctRate !== undefined && { correctRate: opts.correctRate }) });
  const times = scheduleFor(day, rng);
  const poll = morningPoll(p);

  const morning: PostReceipt[] = [];
  for (let i = 0; i < posts.morning.length; i++) {
    try {
      const r = await client.schedule({
        // for ループで i < posts.morning.length を確認済みのため安全。
        text: posts.morning[i] as string,
        scheduledAt: times.morning,
        // poll は先頭ポストにのみ併設。
        ...(i === 0 && poll ? { poll } : {}),
      });
      morning.push(r);
    } catch (e) {
      // 投稿予約エラーに topic・段階の文脈を付与（I-020）。
      throw new Error(
        `[draw/xpost] topic="${p.topic}" id="${p.id}" 朝スレッド[${i}]の予約に失敗しました: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  const morningHeadId = morning[0]?.id;
  const evening: PostReceipt[] = [];
  for (let i = 0; i < posts.evening.length; i++) {
    try {
      const r = await client.schedule({
        // for ループで i < posts.evening.length を確認済みのため安全。
        text: posts.evening[i] as string,
        scheduledAt: times.evening,
        // 夜の先頭は朝の先頭を引用してツリー化（遡れる＋滞在時間）。
        ...(i === 0 && morningHeadId !== undefined ? { quoteOfId: morningHeadId } : {}),
      });
      evening.push(r);
    } catch (e) {
      // 投稿予約エラーに topic・段階の文脈を付与（I-020）。
      throw new Error(
        `[draw/xpost] topic="${p.topic}" id="${p.id}" 夜スレッド[${i}]の予約に失敗しました: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  return { morning, evening, hasPoll: poll !== null };
}
