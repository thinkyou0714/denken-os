import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../lib/chat/types.js";
import {
  appendChatMessage,
  CHAT_HISTORY_MAX,
  clearChat,
  drainSseBuffer,
  extractTextDelta,
  loadChat,
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
