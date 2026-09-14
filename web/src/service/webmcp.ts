import { api, saveRecord } from "./client.js";

interface ContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: unknown): Promise<unknown>;
}
interface ModelContext {
  registerTool(tool: ContextTool): void;
  unregisterTool(name: string): void;
}
let registered = false;
export function registerLearningTools() {
  const context = (document as Document & { modelContext?: ModelContext }).modelContext;
  if (!context || registered) return false;
  const tools: ContextTool[] = [
    {
      name: "denken_read_progress",
      description: "本人の学習指標を読み取る。書き込みは行わない。",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => api("skills"),
    },
    {
      name: "denken_open_learning",
      description: "学習ラボへ移動する。答案の作成・提出は行わない。",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => {
        location.hash = "lab";
        return { opened: true };
      },
    },
    {
      name: "denken_save_note",
      description: "本人のノートを新規保存する書き込み操作。利用者から保存を依頼された内容に使用する。",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string", maxLength: 10000 }, topic: { type: "string", maxLength: 200 } },
        required: ["text"],
        additionalProperties: false,
      },
      execute: async (raw) => {
        const value = raw as { text?: unknown; topic?: unknown };
        if (
          !value ||
          typeof value.text !== "string" ||
          !value.text.trim() ||
          value.text.length > 10000 ||
          (value.topic !== undefined && (typeof value.topic !== "string" || value.topic.length > 200))
        )
          throw new Error("ノートの入力が不正です");
        return saveRecord("note", crypto.randomUUID(), {
          text: value.text,
          topic: value.topic ?? "",
          createdAt: Date.now(),
          origin: "webmcp",
        });
      },
    },
  ];
  for (const tool of tools) context.registerTool(tool);
  registered = true;
  window.addEventListener(
    "pagehide",
    () => {
      for (const tool of tools) context.unregisterTool(tool.name);
      registered = false;
    },
    { once: true },
  );
  window.addEventListener(
    "pageshow",
    (event) => {
      if (event.persisted) registerLearningTools();
    },
    { once: true },
  );
  return true;
}
