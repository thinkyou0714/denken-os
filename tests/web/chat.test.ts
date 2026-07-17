import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../lib/chat/types.js";
import {
  appendChatMessage,
  CHAT_HISTORY_MAX,
  clearChat,
  drainSseBuffer,
  extractTextDelta,
  loadChat,
  streamClaude,
} from "../../web/src/chat.js";
import { MemoryStorage } from "../helpers/storage.js";

const msg = (role: "user" | "assistant", content: string): ChatMessage => ({ role, content, atMs: 1 });

describe("チャット履歴の永続化", () => {
  it("追記して読み戻せる", () => {
    const s = new MemoryStorage();
    appendChatMessage(s, msg("user", "Q"));
    appendChatMessage(s, msg("assistant", "A"));
    const loaded = loadChat(s);
    expect(loaded.map((m) => m.content)).toEqual(["Q", "A"]);
  });

  it("上限を超えると古い順に破棄される", () => {
    const s = new MemoryStorage();
    for (let i = 0; i < CHAT_HISTORY_MAX + 10; i++) appendChatMessage(s, msg("user", `m${i}`));
    const loaded = loadChat(s);
    expect(loaded.length).toBe(CHAT_HISTORY_MAX);
    expect(loaded[0]?.content).toBe("m10");
  });

  it("壊れた JSON・不正な要素は安全に無視する", () => {
    const s = new MemoryStorage();
    s.setItem("denken:chat", "{not json");
    expect(loadChat(s)).toEqual([]);
    s.setItem("denken:chat", JSON.stringify([{ role: "user", content: "ok", atMs: 1 }, { role: "x" }, 42]));
    expect(loadChat(s).map((m) => m.content)).toEqual(["ok"]);
  });

  it("clearChat で空になる", () => {
    const s = new MemoryStorage();
    appendChatMessage(s, msg("user", "Q"));
    clearChat(s);
    expect(loadChat(s)).toEqual([]);
  });
});

describe("drainSseBuffer（SSE分割の純関数）", () => {
  it("完成イベントの data を取り出し、未完分を残す", () => {
    const { data, rest } = drainSseBuffer('data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c":');
    expect(data).toEqual(['{"a":1}', '{"b":2}']);
    expect(rest).toBe('data: {"c":');
  });

  it("event 行は無視して data 行だけ拾う", () => {
    const { data } = drainSseBuffer('event: ping\ndata: {"x":1}\n\n');
    expect(data).toEqual(['{"x":1}']);
  });

  it("イベント境界がない場合は全て rest に残る", () => {
    const { data, rest } = drainSseBuffer("data: partial");
    expect(data).toEqual([]);
    expect(rest).toBe("data: partial");
  });
});

describe("extractTextDelta（イベント→テキスト差分）", () => {
  it("text_delta からテキストを取り出す", () => {
    const payload = JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "こん" } });
    expect(extractTextDelta(payload)).toBe("こん");
  });

  it("text_delta 以外のイベントは null", () => {
    expect(extractTextDelta(JSON.stringify({ type: "message_start" }))).toBeNull();
    expect(extractTextDelta(JSON.stringify({ type: "message_stop" }))).toBeNull();
  });

  it("JSON でないペイロードは無視（null）", () => {
    expect(extractTextDelta("[DONE]")).toBeNull();
  });

  it("error イベントはメッセージ付きで throw する", () => {
    const payload = JSON.stringify({ type: "error", error: { message: "overloaded" } });
    expect(() => extractTextDelta(payload)).toThrow("overloaded");
  });
});

// ── streamClaude（BYOK ネットワーク経路）──────────────────────────────────────
// APIキーを送る最もセキュリティ上重要な経路。fetchFn 注入シームで
// 「送信先が Anthropic のみ」「ヘッダ・ボディの形」「エラー分岐の日本語化」を固定する。

function sseResponse(chunks: string[], status = 200): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Response(stream, { status });
}

function textDeltaEvent(text: string): string {
  return `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text } })}\n\n`;
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const t of gen) out.push(t);
  return out;
}

describe("streamClaude（BYOK 経路の送信先・ヘッダ・エラー分岐）", () => {
  const baseOpts = {
    apiKey: "sk-ant-test-key",
    model: "claude-sonnet-5",
    system: "system prompt",
    messages: [{ role: "user" as const, content: "Q" }],
  };

  it("送信先は api.anthropic.com のみ・x-api-key と直叩きオプトインヘッダを付ける", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchFn = (async (url: unknown, init?: RequestInit) => {
      captured = { url: String(url), init: init ?? {} };
      return sseResponse([textDeltaEvent("A")]);
    }) as typeof fetch;

    await collect(streamClaude({ ...baseOpts, fetchFn }));

    expect(captured).not.toBeNull();
    expect(captured!.url).toBe("https://api.anthropic.com/v1/messages");
    expect(captured!.init.method).toBe("POST");
    const headers = captured!.init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test-key");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    const body = JSON.parse(String(captured!.init.body));
    expect(body.model).toBe("claude-sonnet-5");
    expect(body.stream).toBe(true);
    expect(body.system).toBe("system prompt");
    expect(body.messages).toEqual([{ role: "user", content: "Q" }]);
  });

  it("SSE の text_delta を順に yield する（チャンク分割跨ぎも復元）", async () => {
    const events = textDeltaEvent("こん") + textDeltaEvent("にちは");
    // イベント境界とは無関係な位置でチャンクを割る。
    const cut = events.indexOf("delta") + 3;
    const fetchFn = (async () => sseResponse([events.slice(0, cut), events.slice(cut)])) as typeof fetch;
    expect(await collect(streamClaude({ ...baseOpts, fetchFn }))).toEqual(["こん", "にちは"]);
  });

  it("401 は「APIキーが無効」の日本語エラーにする", async () => {
    const fetchFn = (async () => new Response("unauthorized", { status: 401 })) as typeof fetch;
    await expect(collect(streamClaude({ ...baseOpts, fetchFn }))).rejects.toThrow("APIキーが無効です");
  });

  it("429 はレート制限の日本語エラーにする", async () => {
    const fetchFn = (async () => new Response("rate limited", { status: 429 })) as typeof fetch;
    await expect(collect(streamClaude({ ...baseOpts, fetchFn }))).rejects.toThrow("レート制限");
  });

  it("その他のエラーは status とレスポンス本文の先頭を含める", async () => {
    const fetchFn = (async () => new Response("internal boom", { status: 500 })) as typeof fetch;
    await expect(collect(streamClaude({ ...baseOpts, fetchFn }))).rejects.toThrow("API エラー（500）: internal boom");
  });

  it("body が無い応答は日本語エラーにする", async () => {
    const fetchFn = (async () => new Response(null, { status: 200 })) as typeof fetch;
    await expect(collect(streamClaude({ ...baseOpts, fetchFn }))).rejects.toThrow(
      "ストリーミング応答を取得できませんでした",
    );
  });
});
