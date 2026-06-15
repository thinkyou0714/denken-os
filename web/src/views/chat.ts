/**
 * views/chat.ts — 質問タブ（AIチャット）の描画・送信処理。
 * bubbleNode / chatLogNode / chatChips / sendChat / renderChatLogOnly / renderChat
 * チャット送信に最小間隔 1000ms のガード（I-059）。
 */
import { answerLocally, SUGGESTED_QUESTIONS } from "../../../lib/chat/answer.js";
import { KNOWLEDGE } from "../../../lib/chat/knowledge.js";
import { buildApiMessages, buildSystemPrompt } from "../../../lib/chat/prompt.js";
import { retrieve } from "../../../lib/chat/retrieve.js";
import type { ChatMessage } from "../../../lib/chat/types.js";
import { appendChatMessage, clearChat, loadChat, streamClaude } from "../chat.js";
import { formatMath } from "../mathfmt.js";
import { getApiKey, getChatModel } from "../settings.js";
import { storage, view } from "../state/app.js";
import { h, safeHtml } from "../ui/dom.js";
import { emptyState } from "../ui/widgets.js";
import { switchView } from "./router.js";

/** 送信中フラグ（多重送信の防止）。 */
const chatState = { busy: false, lastSentMs: 0 };

/** チャット1件の吹き出しノード。assistant は数式整形（HTMLエスケープ込み）して表示。 */
function bubbleNode(msg: ChatMessage): HTMLElement {
  if (msg.role === "user") {
    const b = h("div", { class: "msg user" });
    b.textContent = msg.content;
    return b;
  }
  const b = h("div", { class: "msg bot", html: safeHtml(formatMath(msg.content)) });
  if (msg.citations && msg.citations.length > 0) {
    b.append(h("div", { class: "src" }, `出典: ${msg.citations.join(" ／ ")}`));
  }
  return b;
}

function chatLogNode(messages: ChatMessage[]): HTMLElement {
  const log = h("div", { class: "chat", id: "chatlog" });
  if (messages.length === 0) {
    log.append(
      emptyState("💬", "電験のことなら何でも聞いてください", "用語・公式・試験制度・勉強法に、出典付きで答えます。"),
    );
  }
  for (const m of messages) log.append(bubbleNode(m));
  return log;
}

function scrollChatToBottom(): void {
  const log = document.getElementById("chatlog");
  if (log) log.scrollTop = log.scrollHeight;
}

/** おすすめ質問チップ。クリックで即送信。 */
function chatChips(questions: readonly string[]): HTMLElement {
  const wrap = h("div", { class: "chips" });
  for (const q of questions) {
    wrap.append(h("button", { class: "chip", type: "button", onclick: () => void sendChat(q) }, q));
  }
  return wrap;
}

async function sendChat(question: string): Promise<void> {
  const q = question.trim();
  const now = Date.now();
  // チャット連投ガード（I-059）: busy フラグに加えて最小間隔 1000ms のスロットル。
  if (chatState.busy || q.length === 0 || now - chatState.lastSentMs < 1000) return;
  chatState.busy = true;
  chatState.lastSentMs = now;
  appendChatMessage(storage, { role: "user", content: q, atMs: Date.now() });
  renderChatLogOnly();

  const apiKey = getApiKey(storage);
  // どちらのモードでもまずローカル検索（API モードではグラウンディング文脈に流用）。
  const hits = retrieve(q, KNOWLEDGE, { k: 4 });

  if (!apiKey) {
    const a = answerLocally(q);
    appendChatMessage(storage, {
      role: "assistant",
      content: a.text,
      citations: a.citations,
      mode: "local",
      atMs: Date.now(),
    });
    chatState.busy = false;
    renderChatLogOnly(a.suggestions);
    return;
  }

  // API モード: ストリーミング表示。失敗時はローカル回答へフォールバック（沈黙させない）。
  const log = document.getElementById("chatlog");
  const live = h("div", { class: "msg bot streaming" }, "…");
  log?.append(live);
  scrollChatToBottom();
  let acc = "";
  try {
    const history = loadChat(storage);
    const stream = streamClaude({
      apiKey,
      model: getChatModel(storage),
      system: buildSystemPrompt(hits.map((hit) => hit.entry)),
      messages: buildApiMessages(history),
    });
    for await (const chunk of stream) {
      acc += chunk;
      live.innerHTML = formatMath(acc);
      scrollChatToBottom();
    }
    appendChatMessage(storage, {
      role: "assistant",
      content: acc,
      citations: hits.map((hit) => hit.entry.citation),
      mode: "api",
      atMs: Date.now(),
    });
  } catch (e) {
    const local = answerLocally(q);
    const note = e instanceof Error ? e.message : "APIに接続できませんでした。";
    appendChatMessage(storage, {
      role: "assistant",
      content: `⚠️ ${note}\n（内蔵ナレッジで回答します）\n\n${local.text}`,
      citations: local.citations,
      mode: "local",
      atMs: Date.now(),
    });
  } finally {
    chatState.busy = false;
    renderChatLogOnly();
  }
}

/** 入力欄を保ったままログ部分だけ再描画する（入力中テキストを失わせない）。 */
function renderChatLogOnly(suggestions?: readonly string[]): void {
  if (view !== "chat") return;
  const host = document.getElementById("chathost");
  if (!host) return;
  host.innerHTML = "";
  host.append(chatLogNode(loadChat(storage)));
  if (suggestions && suggestions.length > 0) host.append(chatChips(suggestions));
  scrollChatToBottom();
  const btn = document.getElementById("chatsend") as HTMLButtonElement | null;
  if (btn) btn.disabled = chatState.busy;
}

export function renderChat(root: HTMLElement): void {
  const apiKey = getApiKey(storage);
  const history = loadChat(storage);
  const toolbar = h(
    "div",
    { class: "toolbar" },
    h("span", { class: "pill" }, apiKey ? "✨ Claude API（ローカル検索で接地）" : "📚 内蔵ナレッジ（オフライン）"),
    h(
      "button",
      {
        class: "chip",
        type: "button",
        onclick: () => {
          if (!window.confirm("チャット履歴を消去します。よろしいですか？")) return;
          clearChat(storage);
          switchView("chat");
        },
      },
      "履歴を消去",
    ),
  );

  const host = h("div", { id: "chathost" });
  host.append(chatLogNode(history));
  if (history.length === 0) host.append(chatChips(SUGGESTED_QUESTIONS));

  const input = h("textarea", {
    id: "chatin",
    rows: "2",
    placeholder: "電験の質問を入力（Enterで送信 / Shift+Enterで改行）",
    "aria-label": "質問を入力",
  }) as HTMLTextAreaElement;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const q = input.value;
      input.value = "";
      void sendChat(q);
    }
  });
  const send = h(
    "button",
    {
      class: "primary",
      id: "chatsend",
      type: "button",
      onclick: () => {
        const q = input.value;
        input.value = "";
        void sendChat(q);
      },
    },
    "送信",
  ) as HTMLButtonElement;
  send.disabled = chatState.busy;

  root.append(
    toolbar,
    host,
    h("div", { class: "composer" }, input, send),
    h(
      "p",
      { class: "muted" },
      apiKey
        ? "AI回答は誤りを含む可能性があります。数値は学習タブの検算済み問題で確認を。法令は最新の条文を確認してください。"
        : "内蔵ナレッジから出典付きで回答します。設定タブで Anthropic API キーを登録すると、Claude による自由質問に切り替わります。",
    ),
  );
  scrollChatToBottom();
}
