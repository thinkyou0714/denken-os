// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ api: vi.fn(), saveRecord: vi.fn() }));
vi.mock("../../web/src/service/client.js", () => client);
type Tool = { name: string; execute: (input: unknown) => Promise<unknown> };
let api: typeof import("../../web/src/service/webmcp.js");
let listeners: ReturnType<typeof vi.spyOn>;
beforeEach(async () => {
  vi.resetModules();
  client.api.mockReset().mockResolvedValue({ items: [] });
  client.saveRecord.mockReset().mockResolvedValue({ revision: 1 });
  Object.defineProperty(document, "modelContext", { configurable: true, value: undefined });
  listeners = vi.spyOn(window, "addEventListener");
  api = await import("../../web/src/service/webmcp.js");
});
afterEach(() => {
  for (const [name, listener] of listeners.mock.calls)
    window.removeEventListener(name as string, listener as EventListener);
  vi.restoreAllMocks();
});
it("does not pretend an unsupported browser provides agent tools", () =>
  expect(api.registerLearningTools()).toBe(false));
it("registers once, separates reading from requested note writes, and handles page restoration", async () => {
  const tools = new Map<string, Tool>();
  const context = {
    registerTool: vi.fn((tool: Tool) => tools.set(tool.name, tool)),
    unregisterTool: vi.fn((name: string) => tools.delete(name)),
  };
  Object.defineProperty(document, "modelContext", { configurable: true, value: context });
  expect(api.registerLearningTools()).toBe(true);
  expect(api.registerLearningTools()).toBe(false);
  expect(tools.size).toBe(3);
  await tools.get("denken_read_progress")!.execute({});
  expect(client.api).toHaveBeenCalledWith("skills");
  expect(client.saveRecord).not.toHaveBeenCalled();
  await tools.get("denken_open_learning")!.execute({});
  expect(location.hash).toBe("#lab");
  const save = tools.get("denken_save_note")!;
  for (const bad of [null, {}, { text: " " }, { text: "x".repeat(10001) }, { text: "x", topic: 42 }])
    await expect(save.execute(bad)).rejects.toThrow("入力が不正");
  await save.execute({ text: "三相電力の前提を確認", topic: "電力" });
  expect(client.saveRecord).toHaveBeenCalledWith(
    "note",
    expect.any(String),
    expect.objectContaining({ text: "三相電力の前提を確認", topic: "電力", origin: "webmcp" }),
  );
  await save.execute({ text: "追加メモ" });
  window.dispatchEvent(new PageTransitionEvent("pagehide"));
  expect(tools.size).toBe(0);
  window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  expect(tools.size).toBe(3);
  expect(context.registerTool).toHaveBeenCalledTimes(6);
});
