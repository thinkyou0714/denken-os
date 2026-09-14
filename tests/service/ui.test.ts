// @vitest-environment jsdom
/// <reference lib="dom" />
import { beforeEach, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { problemSchema } from "../../lib/engine/schema.js";
import { type Attempt, gradePaper, type Paper } from "../../lib/service/assessment.js";
import catalog from "../../web/service/catalog.json";
import papers from "../../web/service/papers.json";
import type { CatalogueProblem } from "../../web/src/service/catalog.js";
import { renderLab } from "../../web/src/service/lab.js";
import { renderLearning, renderQuestion } from "../../web/src/service/learning-ui.js";
import { renderPaper } from "../../web/src/service/paper-ui.js";

const state = vi.hoisted(() => ({
  attempts: [] as Attempt[],
  notes: [] as { id: string; revision: number; body: Record<string, unknown>; updated_at: number }[],
  schedule: [] as { topic: string; due: boolean; dueMs: number }[],
  saves: [] as { kind: string; body: Record<string, unknown> }[],
  exam: null as { id: string; revision: number; body: Record<string, unknown>; updated_at: number } | null,
  grades: 0,
}));
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
vi.mock("../../web/src/service/events.js", () => ({
  saveAttempt: async (a: Attempt) => {
    state.attempts.push(structuredClone(a));
  },
  flushAttempts: async () => {},
}));
vi.mock("../../web/src/service/client.js", () => ({
  allAttempts: async () => ({ items: structuredClone(state.attempts) }),
  records: async (kind: string) => ({
    items: kind === "note" ? state.notes : kind === "exam" && state.exam ? [state.exam] : [],
  }),
  saveRecord: async (kind: string, _id: string, body: Record<string, unknown>) => {
    state.saves.push({ kind, body: structuredClone(body) });
    if (kind === "exam" && state.exam) {
      state.exam.body = structuredClone(body);
      state.exam.revision++;
    }
    return { revision: state.exam?.revision ?? 1 };
  },
  download: vi.fn(),
  api: async (path: string, _method?: string, body?: Record<string, unknown>) => {
    if (path === "catalog") return { problems: catalog, papers };
    if (path === "skills") return { items: state.schedule };
    if (path === "admin/overview") return { members: [], usage: [], audit: [], calibration: [] };
    if (path === "exam/start") {
      const paper = papers.find((p) => p.id === body?.paperId)!;
      state.exam = {
        id: "session-1",
        revision: 1,
        updated_at: Date.now(),
        body: {
          paperId: paper.id,
          revision: paper.revision,
          mode: body?.mode,
          startedAt: Date.now(),
          deadline: Date.now() + 600000,
          answers: {},
          selected: [],
          visited: [],
          reasons: {},
        },
      };
      return structuredClone(state.exam);
    }
    if (path === "exam/grade") {
      state.grades++;
      const paper = papers.find((p) => p.id === body?.paperId)!;
      return {
        result: gradePaper(
          paper as Paper,
          state.exam!.body.answers as Record<string, string>,
          state.exam!.body.selected as string[],
        ),
      };
    }
    return { items: [] };
  },
}));

beforeEach(() => {
  state.attempts = [];
  state.notes = [];
  state.schedule = [];
  state.saves = [];
  state.exam = null;
  state.grades = 0;
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState({}, "", "#lab/today");
  document.body.innerHTML = '<main id="root"><h1>DENKEN-OS</h1></main>';
  document.body.dataset.studyShell = "true";
  document.body.dataset.studyActive = "false";
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
const root = () => document.getElementById("root")!;
const click = (text: string, host: HTMLElement = root()) => {
  const found = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent === text && !b.hidden,
  );
  expect(found, text).toBeTruthy();
  found!.click();
  return found!;
};
const typedCatalog: CatalogueProblem[] = catalog.map((p) => ({
  ...problemSchema.parse(p),
  revision: p.revision,
  family: p.family,
}));
const choiceProblem = () => typedCatalog.find((p) => p.format === "multiple_choice")!;

it("starts real questions from the home action and keeps setup out of the learning flow", async () => {
  renderLab(root());
  await vi.waitFor(() => expect(root().textContent).toContain("今日の学習を始める"));
  expect(root().querySelector('input[aria-label="受験する年度"]')).toBeNull();
  click("今日の学習を始める");
  await vi.waitFor(() => expect(root().querySelectorAll(".study-question-workspace")).toHaveLength(1));
  expect(root().querySelector(".study-page")?.getAttribute("data-page")).toBe("practice");
  expect(root().querySelector(".study-session-bar")?.textContent).toContain("1 / 5");
  expect(root().querySelector(".solution")).toBeNull();
});

it("shows one question, records the selected answer once, and advances only after the learner chooses next", async () => {
  const pool = typedCatalog.filter((p) => p.format === "multiple_choice").slice(0, 2);
  await renderLearning(root(), { ids: pool.map((p) => p.id), autoStart: true });
  const radio = [...root().querySelectorAll<HTMLInputElement>('input[type="radio"]')].find(
    (r) => r.value === pool[0]!.answer,
  )!;
  radio.click();
  click("回答する");
  await vi.waitFor(() => expect(root().textContent).toContain("正解です"));
  expect(state.attempts).toHaveLength(1);
  expect(state.attempts[0]).toMatchObject({ answer: pool[0]!.answer, hints: 0, revealed: false });
  expect(root().querySelectorAll(".study-question-workspace")).toHaveLength(1);
  expect(root().querySelector(".study-session-bar")?.textContent).toContain("1 / 2");
  expect(root().querySelector(".solution")).not.toBeNull();
  click("次の問題へ");
  expect(root().querySelector(".study-session-bar")?.textContent).toContain("2 / 2");
  expect(root().querySelector(".solution")).toBeNull();
  const result = await axe(root(), { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id)).toEqual(
    [],
  );
});

it("restores the tab-local draft with its disclosed-answer state instead of turning it into an unassisted attempt", async () => {
  const p = choiceProblem();
  renderQuestion(root(), p, "応用", "自力演習", []);
  root().querySelector<HTMLInputElement>('input[type="radio"]')!.click();
  click("解説を見てから学ぶ");
  root().replaceChildren();
  renderQuestion(root(), p, "応用", "自力演習", []);
  expect(root().querySelector<HTMLInputElement>('input[type="radio"]')!.checked).toBe(true);
  click("回答する");
  await vi.waitFor(() => expect(state.attempts).toHaveLength(1));
  expect(state.attempts[0]!.revealed).toBe(true);
  expect(sessionStorage.length).toBe(0);
});

it("keeps support unavailable in the unseen mode and requires attestation", async () => {
  renderQuestion(root(), choiceProblem(), "応用", "未見候補テスト", []);
  expect(
    [...root().querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "考え方のヒント")!.disabled,
  ).toBe(true);
  root().querySelector<HTMLInputElement>('input[type="radio"]')!.click();
  click("回答する");
  await vi.waitFor(() => expect(root().textContent).toContain("初めての問題であることを確認"));
  expect(state.attempts).toHaveLength(0);
});

it("supports all service pages, direct learning routes and an empty review without fake progress", async () => {
  renderLab(root());
  await vi.waitFor(() => expect(root().textContent).toContain("今日の学習を始める"));
  for (const [id, expected] of [
    ["practice", "どの問題を解きますか"],
    ["papers", "この科目を始める"],
    ["review", "今は該当する問題がありません"],
    ["library", "学びたい内容から探す"],
    ["notes", "新しいノートを書く"],
    ["tools", "使う学習ツール"],
    ["tutor", "解き方で迷ったら"],
    ["progress", "初回・ヒントなしの正答率"],
    ["settings", "対象試験と学習時間"],
    ["admin", "会員権限と操作履歴"],
  ]) {
    root().querySelector<HTMLAnchorElement>(`[data-study-page="${id}"]`)!.click();
    await vi.waitFor(() => expect(root().textContent).toContain(expected));
    expect(location.hash).toBe(`#lab/${id}`);
  }
  history.replaceState({}, "", "#lab/review");
  window.dispatchEvent(new Event("denken-lab-route"));
  await vi.waitFor(() =>
    expect(root().querySelector('.study-nav [aria-current="page"]')?.getAttribute("data-study-page")).toBe("review"),
  );
  const result = await axe(root(), { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id)).toEqual(
    [],
  );
});

it("moves between official question groups, persists flags and asks for review before grading", async () => {
  await renderPaper(root());
  click("この科目を始める");
  await vi.waitFor(() => expect(root().querySelector(".study-exam-workspace")).not.toBeNull());
  expect([...root().querySelectorAll<HTMLElement>(".lab-question")].filter((p) => !p.hidden)).toHaveLength(1);
  const blank = root().querySelector<HTMLSelectElement>('select[data-blank="q1_1"]')!;
  blank.value = "カ";
  blank.dispatchEvent(new Event("change"));
  const flag = [...root().querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(
    (i) => i.parentElement?.textContent === "あとで見直す",
  )!;
  flag.click();
  click("今すぐ保存");
  await vi.waitFor(() => expect(state.saves.some((s) => s.kind === "exam")).toBe(true));
  expect(state.exam!.body).toMatchObject({ answers: { q1_1: "カ" }, flagged: ["q1"] });
  root().querySelectorAll<HTMLButtonElement>(".study-question-nav button")[1]!.click();
  expect(root().querySelector("object")?.getAttribute("data")).toContain(`#page=${papers[0]!.groups[1]!.page}`);
  expect([...root().querySelectorAll<HTMLElement>(".lab-question")].filter((p) => !p.hidden)[0]!.textContent).toContain(
    "問2",
  );
  click("採点前に回答を確認");
  await vi.waitFor(() => expect(root().textContent).toContain("この答案を提出しますか"));
  expect(state.grades).toBe(0);
  click("この答案を提出して採点");
  await vi.waitFor(() => expect(state.grades).toBe(1));
  expect(root().textContent).toContain("結果 3 / 90点");
  expect([...root().querySelectorAll<HTMLSelectElement>("select[data-blank]")].every((i) => i.disabled)).toBe(true);
});
