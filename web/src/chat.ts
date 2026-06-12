/**
 * chat.ts — 質問タブのクライアントロジック（履歴の永続化＋Claude API ストリーミング）。
 *
 * - 履歴は localStorage（この端末のみ）。上限件数で自動トリム（容量あふれの根本対策）。
 * - API 呼び出しは BYOK（ユーザー自身の Anthropic API キー）でブラウザから直接行う。
 *   キーはローカル保存のみで、送信先は api.anthropic.com のみ。
 * - SSE のパースは純関数に切り出してテスト可能にする。
 */
import type { ApiMessage } from "../../lib/chat/prompt.js";
import { MAX_TOKENS } from "../../lib/chat/prompt.js";
import type { ChatMessage } from "../../lib/chat/types.js";
import type { StorageLike } from "./store.js";

const CHAT_KEY = "denken:chat";

/** 保存する最大メッセージ数（超過分は古い順に破棄）。 */
export const CHAT_HISTORY_MAX = 60;

export function loadChat(storage: StorageLike): ChatMessage[] {
  try {
    const raw = storage.getItem(CHAT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        typeof m === "object" &&
        m !== null &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string",
    );
  } catch {
    console.warn(`[chat] JSON.parse 失敗: key=${CHAT_KEY}`);
    return [];
  }
}

export function saveChat(storage: StorageLike, messages: ChatMessage[]): void {
  storage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-CHAT_HISTORY_MAX)));
}

/** メッセージを追記し、トリム済みの全履歴を返す。 */
export function appendChatMessage(storage: StorageLike, msg: ChatMessage): ChatMessage[] {
  const next = [...loadChat(storage), msg].slice(-CHAT_HISTORY_MAX);
  saveChat(storage, next);
  return next;
}

export function clearChat(storage: StorageLike): void {
  storage.setItem(CHAT_KEY, "[]");
}

// ---- SSE（Server-Sent Events）パース: 純関数 ----

/**
 * ストリームバッファから完成したイベントの data 行を取り出す。
 * @returns data: 完成イベントの data ペイロード配列 / rest: 未完の残りバッファ
 */
export function drainSseBuffer(buffer: string): { data: string[]; rest: string } {
  const events = buffer.split("\n\n");
  const rest = events.pop() ?? "";
  const data: string[] = [];
  for (const ev of events) {
    for (const line of ev.split("\n")) {
      if (line.startsWith("data:")) data.push(line.slice(5).trim());
    }
  }
  return { data, rest };
}

/** イベント JSON からテキスト差分を取り出す（text_delta 以外は null、error イベントは throw）。 */
export function extractTextDelta(payload: string): string | null {
  let ev: { type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } };
  try {
    ev = JSON.parse(payload) as typeof ev;
  } catch {
    return null; // "[DONE]" など JSON でないペイロードは無視
  }
  if (ev.type === "error") throw new Error(ev.error?.message ?? "APIエラー");
  if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") return ev.delta.text ?? "";
  return null;
}

export interface StreamClaudeOptions {
  apiKey: string;
  model: string;
  system: string;
  messages: ApiMessage[];
  signal?: AbortSignal;
  /** テスト用に差し替え可能な fetch。 */
  fetchFn?: typeof fetch;
}

/**
 * Claude Messages API をストリーミングで呼び、テキスト差分を順に yield する。
 * エラーはユーザーに見せられる日本語メッセージの Error にして投げる。
 */
export async function* streamClaude(opts: StreamClaudeOptions): AsyncGenerator<string> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: opts.signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
      // ブラウザ直叩き（BYOK）の明示オプトイン。キーは端末内のみ・送信先は Anthropic のみ。
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: MAX_TOKENS,
      stream: true,
      system: opts.system,
      messages: opts.messages,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("APIキーが無効です。設定タブで確認してください。");
    if (res.status === 429) throw new Error("レート制限に達しました。少し待ってから再送してください。");
    throw new Error(`API エラー（${res.status}）: ${detail.slice(0, 200)}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("ストリーミング応答を取得できませんでした。");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { data, rest } = drainSseBuffer(buffer);
    buffer = rest;
    for (const payload of data) {
      const text = extractTextDelta(payload);
      if (text) yield text;
    }
  }
}
