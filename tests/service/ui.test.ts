// @vitest-environment jsdom
/// <reference lib="dom" />
import { beforeEach, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import catalog from "../../web/service/catalog.json";
import papers from "../../web/service/papers.json";
import { renderLab } from "../../web/src/service/lab.js";

vi.mock("../../web/src/service/catalog.js", () => ({
  catalogue: catalog,
  libraryManifest: { experimental: { total: 12890, shards: [] } },
}));
vi.mock("../../web/src/state/app.js", () => ({
  progress: { setExamDate: vi.fn(), record: vi.fn() },
  storage: { getItem: () => null, setItem: vi.fn() },
}));
vi.mock("../../web/src/service/cloud-storage.js", () => ({
  identity: { id: "owner", role: "owner" },
  syncStatus: "同期済み",
  cloudStorage: { flush: async () => {}, pendingExport: () => ({ data: {} }) },
}));
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<main id="root"><h1>DENKEN-OS</h1></main>';
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const path = String(url);
      const body = path.endsWith("/catalog")
        ? { problems: catalog, papers }
        : path.endsWith("/admin/overview")
          ? { members: [], usage: [], audit: [], calibration: [] }
          : { items: [], nextBefore: null, nextId: null };
      return Response.json(body);
    }),
  );
});
it("renders each real lab surface, keyboard tabs and accessible form structure", async () => {
  const root = document.getElementById("root")!;
  renderLab(root);
  await vi.waitFor(() => expect(root.textContent).toContain("次の学習"));
  const nav = root.querySelector('[role="tablist"]')!;
  const buttons = [...nav.querySelectorAll<HTMLButtonElement>("button")];
  buttons[0]!.focus();
  nav.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  await vi.waitFor(() => expect(root.textContent).toContain("自力演習を選ぶ"));
  expect(buttons[1]!.getAttribute("aria-selected")).toBe("true");
  const start = [...root.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent === "この問題を開始",
  )!;
  start.click();
  await vi.waitFor(() => expect(root.textContent).toContain("この式を選んだ理由"));
  const result = await axe(root, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id)).toEqual(
    [],
  );
  for (const [index, expected] of [
    [2, "新しく開始する"],
    [3, "最初の不整合を確認"],
    [4, "収録範囲の確認"],
    [5, "旧サイト・別環境から記録を移す"],
    [6, "会員権限と操作履歴"],
  ] as const) {
    buttons[index]!.click();
    await vi.waitFor(() => expect(root.textContent).toContain(expected));
  }
});
