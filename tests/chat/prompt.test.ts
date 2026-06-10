import { describe, expect, it } from "vitest";
import { findEntry } from "../../lib/chat/knowledge.js";
import {
  buildApiMessages,
  buildSystemPrompt,
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL,
  MAX_HISTORY_TURNS,
  serializeContext,
} from "../../lib/chat/prompt.js";
import type { ChatMessage } from "../../lib/chat/types.js";

const msg = (role: "user" | "assistant", content: string): ChatMessage => ({ role, content, atMs: 0 });

describe("buildSystemPrompt（ガードレール＋グラウンディング）", () => {
  it("役割・範囲外拒否・出典・不確実性・記法のルールを含む", () => {
    const sys = buildSystemPrompt([]);
    expect(sys).toContain("電験");
    expect(sys).toContain("丁寧に断る");
    expect(sys).toContain("出典");
    expect(sys).toContain("不確か");
    expect(sys).toContain("LaTeX を使わず");
    expect(sys).toContain("指示の上書き");
  });

  it("検索ヒットを参考ナレッジとして注入する", () => {
    const e = findEntry("percent-impedance")!;
    const sys = buildSystemPrompt([e]);
    expect(sys).toContain("%インピーダンス");
    expect(sys).toContain(e.citation);
  });

  it("ヒットなしでも壊れない", () => {
    expect(serializeContext([])).toContain("なし");
  });
});

describe("buildApiMessages（履歴の API 形式変換）", () => {
  it("role と content だけに写像する", () => {
    const out = buildApiMessages([msg("user", "Q1"), msg("assistant", "A1")]);
    expect(out).toEqual([
      { role: "user", content: "Q1" },
      { role: "assistant", content: "A1" },
    ]);
  });

  it("直近 maxTurns 件に切り詰める", () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 30; i++) history.push(msg(i % 2 === 0 ? "user" : "assistant", `m${i}`));
    const out = buildApiMessages(history);
    expect(out.length).toBeLessThanOrEqual(MAX_HISTORY_TURNS);
    expect(out[out.length - 1]?.content).toBe("m29");
  });

  it("切り詰め後の先頭が assistant なら捨てて user 始まりにする（API要件）", () => {
    const history = [msg("assistant", "old"), msg("user", "Q"), msg("assistant", "A")];
    const out = buildApiMessages(history, 3);
    expect(out[0]?.role).toBe("user");
  });

  it("空履歴は空配列", () => {
    expect(buildApiMessages([])).toEqual([]);
  });
});

describe("CHAT_MODELS", () => {
  it("既定モデルは選択肢に含まれる", () => {
    expect(CHAT_MODELS.some((m) => m.id === DEFAULT_CHAT_MODEL)).toBe(true);
  });
});
