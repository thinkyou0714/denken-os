// @vitest-environment jsdom
/// <reference lib="dom" />
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { problemSchema } from "../../lib/engine/schema.js";
import { type Attempt, gradePaper, type Paper } from "../../lib/service/assessment.js";
import catalog from "../../web/service/catalog.json";
import papers from "../../web/service/papers.json";
import { renderAdmin } from "../../web/src/service/admin-ui.js";
import type { CatalogueProblem } from "../../web/src/service/catalog.js";
import { download } from "../../web/src/service/client.js";
import { renderData } from "../../web/src/service/data-ui.js";
import { renderReviewQueue, renderToday } from "../../web/src/service/home-ui.js";
import { renderLab } from "../../web/src/service/lab.js";
import { renderLearning, renderQuestion } from "../../web/src/service/learning-ui.js";
import { renderLibrary } from "../../web/src/service/library-ui.js";
import { renderPaper } from "../../web/src/service/paper-ui.js";
import { renderProgress, renderStudySettings } from "../../web/src/service/progress-ui.js";
import { readingControls } from "../../web/src/service/study-ui.js";
import { renderTools } from "../../web/src/service/tools-ui.js";
import { renderTutor } from "../../web/src/service/tutor-ui.js";

const state = vi.hoisted(() => ({
  attempts: [] as Attempt[],
  notes: [] as { id: string; revision: number; body: Record<string, unknown>; updated_at: number }[],
  schedule: [] as { topic: string; due: boolean; dueMs: number }[],
  saves: [] as { kind: string; body: Record<string, unknown> }[],
  exam: null as { id: string; revision: number; body: Record<string, unknown>; updated_at: number } | null,
  grades: 0,
  extra: {} as Record<string, { id: string; revision: number; body: Record<string, unknown>; updated_at: number }[]>,
  calls: [] as { path: string; method: string | undefined; body: Record<string, unknown> | undefined }[],
  tutorResult: {
    mode: "hint",
    answer: "条件と単位を確認",
    held: false,
    sources: [{ id: "source", citation: "確認済み教材" }],
    reference: "",
    calculations: [] as { expression: string; result: number }[],
  },
}));
vi.mock("../../web/src/service/catalog.js", () => ({
  catalogue: catalog,
  libraryManifest: { experimental: { total: 12890, shards: [] } },
  loadExperimentalSubject: async () => catalog.slice(0, 2),
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
  attemptSyncStatus: () => "",
  pendingAttemptsExport: () => ({ owner: "owner", raw: "[]" }),
}));
vi.mock("../../web/src/service/client.js", () => ({
  allAttempts: async () => ({ items: structuredClone(state.attempts) }),
  records: async (kind: string) => ({
    items: state.extra[kind] ?? (kind === "note" ? state.notes : kind === "exam" && state.exam ? [state.exam] : []),
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
    state.calls.push({ path, method: _method, body });
    if (path === "catalog") return { problems: catalog, papers };
    if (path === "skills") return { items: state.schedule };
    if (path === "admin/overview")
      return {
        members: [{ id: "student", role: "student", status: "active" }],
        usage: [{ day: "2026-09-14", kind: "tutor", requests: 1, input_tokens: 1000, output_tokens: 500 }],
        audit: [{ action: "test", target: "fixture", created_at: 1 }],
        calibration: [{ problemId: "fixture", learners: 1, rate: null }],
        runtime: {
          checkedAt: 1,
          authentication: "owner-compatibility",
          database: "ready",
          tutorConfigured: false,
          ocrConfigured: false,
          imageStorage: true,
          automationConfigured: false,
        },
      };
    if (path === "tutor") return structuredClone(state.tutorResult);
    if (path === "admin/support")
      return { items: (state.extra.support ?? []).map((r) => ({ ...r, owner: "student" })) };
    if (path === "assets") return { items: state.extra.assets ?? [] };
    if (path === "import") return { imported: 1, skipped: 0, conflicts: [] };
    if (path === "admin/purge") return { deleted: 0 };
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
  state.extra = {};
  state.calls = [];
  state.tutorResult = {
    mode: "hint",
    answer: "条件と単位を確認",
    held: false,
    sources: [{ id: "source", citation: "確認済み教材" }],
    reference: "",
    calculations: [],
  };
  vi.mocked(download).mockClear();
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
const field = (label: string, value: string, host = root()) => {
  const el = [
    ...host.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea"),
  ].find((e) => e.getAttribute("aria-label") === label)!;
  expect(el, label).toBeTruthy();
  el.value = value;
  el.dispatchEvent(new Event("input"));
  el.dispatchEvent(new Event("change"));
  return el;
};
const tick = (text: string, host = root()) => {
  const el = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(
    (e) => e.parentElement?.textContent === text,
  )!;
  expect(el, text).toBeTruthy();
  el.click();
  return el;
};
const press = async (text: string, host = root()) => {
  const b = click(text, host);
  await vi.waitFor(() => expect(b.disabled).toBe(false));
};
const row = (id: string, body: Record<string, unknown>) => ({ id, body, revision: 1, updated_at: Date.now() });
const past = (p = choiceProblem(), values: Partial<Attempt> = {}): Attempt => ({
  id: crypto.randomUUID(),
  problemId: p.id,
  revision: p.revision,
  family: p.family,
  topic: p.topic,
  subject: p.subject,
  skill: "応用",
  answer: p.answer,
  correct: false,
  score: 0,
  hints: 0,
  revealed: false,
  mode: "practice",
  startedAt: Date.now() - 60000,
  finishedAt: Date.now(),
  cause: "不明",
  graderVersion: "service-1",
  ...values,
});

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

it("replans available time, starts individual tasks and distinguishes an empty secondary session", async () => {
  const p = choiceProblem(),
    launch = vi.fn(),
    navigate = vi.fn();
  state.attempts = [past(p)];
  state.schedule = [{ topic: p.topic, due: true, dueMs: 1 }];
  await renderToday(root(), launch, navigate);
  await press("45分");
  await press("この計画を保存");
  expect(state.saves.find((s) => s.kind === "plan")?.body.minutes).toBe(45);
  await press("解く");
  expect(launch).toHaveBeenCalledWith(expect.objectContaining({ autoStart: true }));
  root().querySelector<HTMLButtonElement>(".study-subject-list button")?.click();
  root().replaceChildren();
  state.extra.profile = [row("profile", { stage: "二次", minutes: "5" })];
  await renderToday(root(), launch, navigate);
  expect(root().textContent).toContain("この時間枠に収まる課題がありません");
  await press("教材から選ぶ");
  expect(navigate).toHaveBeenCalledWith("library");
});

it("reviews the latest result instead of a superseded wrong answer and launches due or supported problems", async () => {
  const p = choiceProblem(),
    other = typedCatalog.find((x) => x.id !== p.id)!,
    launch = vi.fn();
  state.attempts = [
    past(p, { finishedAt: 100 }),
    past(p, { correct: true, score: 1, finishedAt: 200 }),
    past(other, { hints: 1, cause: "単位", finishedAt: 300 }),
  ];
  state.schedule = [{ topic: p.topic, due: true, dueMs: 1 }];
  await renderReviewQueue(root(), launch);
  await press("解き直す");
  expect(launch.mock.calls[0]![0].ids).toContain(p.id);
  const batch = [...root().querySelectorAll<HTMLButtonElement>("button")].find((b) =>
    b.textContent?.endsWith("問を復習する"),
  )!;
  batch.click();
  expect(launch.mock.calls.at(-1)![0].mode).toBe("復習");
  await press("間違えた問題");
  await press("解き直す");
  expect(launch.mock.calls.at(-1)![0].ids).toEqual([other.id]);
  await press("ヒントを使った問題");
  expect(root().textContent).toContain(other.topic);
  state.attempts = [];
  root().replaceChildren();
  await renderReviewQueue(root(), launch);
  await press("間違えた問題");
  await press("演習へ進む");
  expect(launch).toHaveBeenLastCalledWith({});
});

it("preserves hint use, reflection and export throughout a single-problem session", async () => {
  const p = choiceProblem(),
    exit = vi.fn();
  await renderLearning(root(), { ids: [p.id], autoStart: true, onExit: exit });
  await press("回答する");
  expect(state.attempts).toHaveLength(0);
  field("この式を選んだ理由・成立条件", "平衡三相の条件を確認");
  field("答えの桁・上限下限の予想", "10の桁");
  field("つまずきの原因", "単位");
  tick("答案の組み立て方を見る");
  await press("考え方のヒント");
  tick("答案の組み立て方を見る");
  root().querySelector<HTMLInputElement>('input[type="radio"]')!.click();
  await press("回答する");
  expect(state.attempts[0]!.hints).toBeGreaterThan(0);
  field("次に気をつけること（任意）", "kWとWをそろえる");
  await press("間違いノートへ残す");
  expect(state.saves.find((s) => s.kind === "note")?.body.text).toBe("kWとWをそろえる");
  await press("監修者への確認依頼を残す");
  expect(state.saves.find((s) => s.kind === "support")?.body.shareWithReviewer).toBe(true);
  await press("ノート・別のAIへ引き継ぐ");
  expect(download).toHaveBeenCalledWith(
    expect.stringContaining(p.id),
    expect.stringContaining(p.revision),
    "text/markdown",
  );
  await press("学習のまとめを見る");
  expect(root().textContent).toContain("今回の学習を振り返る");
  await press("今日の学習へ戻る");
  expect(exit).toHaveBeenCalledOnce();
  await press("別の問題を選ぶ");
  expect(root().querySelector<HTMLElement>(".lab-panel")?.hidden).toBe(false);
});

it("supports descriptive and numeric submissions with their distinct grading and session setup", async () => {
  const p = typedCatalog.find((p) => p.format === "descriptive")!;
  await renderLearning(root());
  field("科目", p.subject);
  field("練習の目的", "説明練習");
  tick("関連する論点を混ぜて出題する");
  field("一度に学ぶ問題数", "1");
  field("最初の問題", p.id);
  field("確認する技能", "論説");
  await press("学習を始める");
  field("自分の答案・説明", "400 / 5 = 80\n電流と電圧の関係を示す。");
  await press("答案を保存して確認する");
  expect(state.attempts[0]?.correct).toBeNull();
  expect(root().textContent).toContain("数値式の検算結果");
  await press("学習のまとめを見る");
  expect(root().textContent).toContain("記述問題は自動で正誤を決めず");
  await press("別の問題を選ぶ");
  field("練習の目的", "復習");
  const n = typedCatalog.find((p) => p.format === "numeric")!;
  root().replaceChildren();
  renderQuestion(root(), n, "計算", "自力演習", []);
  field("自分の答え", n.answer);
  await press("回答する");
  expect(state.attempts.at(-1)?.problemId).toBe(n.id);
});

it("records an attested unseen attempt and filters previously encountered families", async () => {
  const p = choiceProblem();
  renderQuestion(root(), p, "応用", "未見候補テスト", []);
  tick("この問題と同じ解法の問題を、以前に学習していない");
  root().querySelector<HTMLInputElement>('input[type="radio"]')!.click();
  await press("回答する");
  expect(state.attempts[0]?.mode).toBe("holdout");
  root().replaceChildren();
  await renderLearning(root());
  field("練習の目的", "未見候補テスト");
  const ids = [...root().querySelectorAll<HTMLOptionElement>('select[aria-label="最初の問題"] option')].map(
    (o) => o.value,
  );
  expect(ids).not.toContain(p.id);
});

it("saves study conditions and weekly pacing without converting provisional exam results to confirmed ones", async () => {
  state.extra.profile = [
    row("profile", {
      stage: "一次",
      minutes: "15",
      exemptions: "理論：自己採点",
      exemptionStatus: "未確定・自己採点",
      weeklyMinutes: "210",
    }),
  ];
  await renderStudySettings(root());
  field("今日の時間枠", "45");
  field("対策する段階", "二次");
  await press("学習条件を保存");
  expect(state.saves[0]?.body).toMatchObject({ stage: "二次", minutes: "45", exemptionStatus: "未確定・自己採点" });
  state.attempts = [
    past(),
    past(choiceProblem(), { mode: "review", correct: true, score: 1, finishedAt: Date.now() - 9 * 86400000 }),
  ];
  root().replaceChildren();
  await renderProgress(root());
  await press("次の7日の時間配分を保存");
  expect(state.saves.find((s) => s.body.type === "weekly-adjustment")?.body.perDay).toBe(30);
});

it("creates, searches, updates and exports a note plus a complete pending-data backup", async () => {
  state.extra.correction = [row("correction", { problemId: "q", reason: "単位を訂正", text: "Vを使う" })];
  await renderData(root());
  await press("ノートを追加");
  expect(state.saves).toHaveLength(0);
  field("論点", "変圧器");
  field("自分の説明・気づいたこと", "基準容量をそろえる");
  field("つまずき", "単位");
  await press("ノートを追加");
  expect(root().textContent).toContain("基準容量をそろえる");
  field("ノートを検索", "不存在");
  expect(root().textContent).toContain("該当するノートがありません");
  field("ノートを検索", "変圧器");
  field("追記・修正", "電圧基準も確認する");
  await press("ノートを更新");
  expect(root().querySelector(".lab-prose")?.textContent).toBe("電圧基準も確認する");
  await press("Markdownで書き出す");
  expect(download).toHaveBeenCalledWith(
    expect.stringContaining("DENKEN-note"),
    expect.stringContaining("電圧基準も確認する"),
    "text/markdown",
  );
  await press("保存待ちの内容を書き出す");
  const pending = vi.mocked(download).mock.calls.find((c) => c[0] === "DENKEN-pending.json")!;
  expect(JSON.parse(pending[1]).attempts).toEqual({ owner: "owner", raw: "[]" });
  await press("保存待ちを再送");
  await press("学習記録をすべて書き出す");
  field("実際に起きたこと", "問題を途中で中断した");
  field("変えてほしいこと", "再開位置がわかるように");
  await press("フィードバックを保存");
  expect(state.saves.some((s) => s.kind === "feedback")).toBe(true);
});

it("searches reviewed learning material and keeps experimental previews outside normal exercise", async () => {
  const launch = vi.fn();
  await renderLibrary(root(), launch);
  const search = root().querySelector<HTMLInputElement>('input[type="search"]')!;
  search.value = "存在しない論点";
  search.dispatchEvent(new Event("input"));
  expect(root().textContent).toContain("条件に合う教材がありません");
  search.value = "";
  search.dispatchEvent(new Event("input"));
  await press("この問題を解く");
  expect(launch).toHaveBeenCalledWith(expect.objectContaining({ autoStart: true }));
  const mode = [...root().querySelectorAll<HTMLSelectElement>("select")].find((s) =>
    [...s.options].some((o) => o.value === "生成問題の検証用"),
  )!;
  mode.value = "生成問題の検証用";
  mode.dispatchEvent(new Event("change"));
  await vi.waitFor(() => expect(root().textContent).toContain("検証用に開く"));
  await press("検証用に開く");
  expect(root().textContent).toContain("未監修の生成問題です");
  await press("監修用データを書き出す");
  expect(state.attempts).toHaveLength(0);
});

it("offers a grounded tutor hint, presents held candidates as such and saves a requested follow-up", async () => {
  renderTutor(root());
  await press("単位をどうそろえる？");
  await press("次のヒント");
  expect(state.calls.find((c) => c.path === "tutor")?.body).toMatchObject({
    question: "単位をどうそろえる？",
    reveal: false,
  });
  state.tutorResult = {
    ...state.tutorResult,
    mode: "ai-suggestion",
    held: true,
    reference: "確認済みの計算手順",
    calculations: [{ expression: "2+2", result: 4 }],
  };
  await press("解説を確認");
  expect(root().textContent).toContain("AIの説明候補");
  expect(root().textContent).toContain("確認済みの計算手順");
  await press("解決しなかった質問を残す");
  expect(state.saves.find((s) => s.kind === "support")?.body.shareWithReviewer).toBe(true);
  const chooser = root().querySelector<HTMLSelectElement>("select")!;
  chooser.selectedIndex = 1;
  chooser.dispatchEvent(new Event("change"));
  expect(root().textContent).not.toContain("確認済みの計算手順");
});

it("changes reading preferences while preserving explicit learner control", async () => {
  root().append(readingControls());
  await press("大きめ");
  expect(document.body.dataset.readingSize).toBe("large");
  tick("演習中はメニューを隠す");
  expect(document.body.dataset.studyFocus).toBe("true");
  await press("標準");
  expect(localStorage.getItem("denken:readingSize")).toBe("standard");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("checks equations and model predictions while separating unreviewed drills from graded study", async () => {
  renderTools(root());
  field("使う学習ツール", "四則・√と途中式の検算");
  field("計算式", "2+3*4");
  await press("計算する");
  expect(root().querySelector("output")?.textContent).toBe("14");
  field("途中式を1行ずつ入力（数値式 = 数値式）", "2+2=4\n3*3=8");
  await press("最初の不整合を確認");
  expect(root().textContent).toContain("最初の不整合は2行目");
  field("途中式を1行ずつ入力（数値式 = 数値式）", "2+2=4");
  await press("最初の不整合を確認");
  field("使う学習ツール", "図と式を操作する");
  for (const name of ["RCのステップ応答", "標準二次系の応答", "入力・出力・損失", "基準容量と％Z"])
    field("モデル", name);
  field("新基準容量 [MVA]", "30");
  field("値を変える前の予想", "15%になる");
  await press("予想と結果を保存");
  expect(state.saves.find((s) => s.body.type === "prediction")?.body.result).toMatchObject({ newPercentZ: 15 });
  field("旧基準容量 [MVA]", "0");
  expect(root().querySelector('[role="alert"]')).not.toBeNull();
  field("使う学習ツール", "短い確認ドリル");
  field("自分の答え・式", "0");
  await press("解説と照合");
  expect(root().textContent).toContain("戻る前提");
  expect(state.attempts).toHaveLength(0);
  field("使う学習ツール", "記号を条件と結びつける");
  field("記号・用語・単位を探す", "時定数");
  field("使う学習ツール", "導出の支援を少しずつ外す");
  field("支援の量", "出発点のみ");
  field("支援の量", "ヒントなし");
  field("式の導出と成立条件", "V=IRをP=VIに代入する");
  await press("自分の説明を保存して参照を開く");
  expect(state.saves.find((s) => s.body.type === "derivation")?.body.mode).toBe("validation");
});

it("stores a diagram's textual explanation and maps pointer positions into its drawing coordinates", async () => {
  const context = {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
  };
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context as unknown as CanvasRenderingContext2D);
  renderTools(root());
  field("使う学習ツール", "図を自分で再構成する");
  const canvas = root().querySelector("canvas")!;
  Object.defineProperty(canvas, "setPointerCapture", { value: vi.fn() });
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 280,
    height: 140,
    x: 0,
    y: 0,
    right: 280,
    bottom: 140,
    toJSON: () => ({}),
  });
  for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"])
    canvas.dispatchEvent(Object.assign(new Event(type), { clientX: 50, clientY: 30, pointerId: 1 }));
  expect(context.lineTo).toHaveBeenCalledWith(100, 60);
  await press("描き直す");
  field("軸・単位・向き・初期値・定常値を言葉で説明（描画の代替にも使えます）", "横軸は時刻、縦軸は電圧");
  await press("説明をノートへ保存");
  expect(state.saves.at(-1)?.body).toMatchObject({ type: "diagram-reconstruction", text: "横軸は時刻、縦軸は電圧" });
});

it("uses browser speech only on request, retains a text alternative and requires transcript confirmation", async () => {
  const speak = vi.fn((u: { onend?: () => void }) => u.onend?.()),
    cancel = vi.fn();
  vi.stubGlobal("speechSynthesis", { speak, cancel });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      lang = "";
      onend: (() => void) | null = null;
      constructor(public text: string) {}
    },
  );
  let recognition: { lang: string; interimResults: boolean; onresult: (e: unknown) => void; onerror: () => void };
  const start = vi.fn();
  vi.stubGlobal(
    "SpeechRecognition",
    class {
      lang = "";
      interimResults = false;
      onresult = (_e: unknown) => {};
      onerror = () => {};
      constructor() {
        recognition = this;
      }
      start = start;
      stop = vi.fn();
    },
  );
  renderTools(root());
  field("使う学習ツール", "説明を聞く・自分の言葉で話す");
  expect(speak).not.toHaveBeenCalled();
  await press("次の説明を聞く");
  expect(speak).toHaveBeenCalledOnce();
  tick("次の段階へ進む前に自分で答える");
  await press("次の説明を聞く");
  await press("読み上げを止める");
  expect(cancel).toHaveBeenCalled();
  await press("自分の説明を音声入力");
  expect(start).toHaveBeenCalledOnce();
  recognition!.onresult({ results: { 0: { 0: { transcript: "有効電力は" } }, length: 1 } });
  recognition!.onerror();
  expect(root().textContent).toContain("音声入力を完了できませんでした");
  await press("確認した説明を保存");
  expect(state.saves).toHaveLength(0);
  tick("文字起こしの式・単位・記号を確認した");
  await press("確認した説明を保存");
  expect(state.saves[0]?.body).toMatchObject({ text: "有効電力は", confirmed: true });
  const chooser = root().querySelector<HTMLSelectElement>('select[aria-label="教材"]')!;
  chooser.selectedIndex = 1;
  chooser.dispatchEvent(new Event("change"));
});

it("provides text fallbacks when speech APIs are unavailable", async () => {
  renderTools(root());
  field("使う学習ツール", "説明を聞く・自分の言葉で話す");
  await press("次の説明を聞く");
  await press("自分の説明を音声入力");
  expect(root().textContent).toContain("文章で確認できます");
  expect(root().textContent).toContain("説明を文字で入力できます");
});

it("shows operational readiness and saves capacity, cost and observation records without enabling external services", async () => {
  state.extra.interview = [row("prior", { reason: "復習に役立つ", willingness: "検討する" })];
  await renderAdmin(root());
  expect(root().textContent).toContain("接続状況と残る準備");
  expect(root().textContent).toContain("接続設定待ち");
  field("1週間の監修時間（分）", "120");
  field("1件の実測監修時間（分）", "30");
  field("監修待ちの件数", "2");
  await press("作問の上限を計算・保存");
  expect(state.saves.find((s) => s.kind === "capacity")?.body.capacity).toBe(4);
  field("月間利用者数", "10");
  field("時間単価", "3000");
  field("監修時間（分）", "60");
  await press("費用を計算・保存");
  expect(state.saves.find((s) => s.kind === "cost")?.body.total).toBe(3000);
  field("匿名の実測結果・端末・成功／失敗・所要時間", "テスト用の操作観察");
  field("継続したい理由", "復習を探しやすい");
  await press("検証記録を保存");
  expect(state.saves.some((s) => s.kind === "interview")).toBe(true);
  field("student の権限", "reviewer");
  await press("この会員の権限を更新");
  expect(state.calls.find((c) => c.path === "admin/member")?.body).toMatchObject({ id: "student", role: "reviewer" });
  await press("期限切れ画像を削除");
  expect(root().textContent).toContain("0件の期限切れ画像");
});

it("keeps review approval, source registration and expert responses behind their explicit review controls", async () => {
  state.extra.rubric = [row("rubric-one", { problemId: "q", problemRevision: "v1", title: "テスト用採点観点" })];
  state.extra.ingest = [
    row("candidate", {
      title: "公式資料候補",
      status: "draft",
      url: "https://www.shiken.or.jp/",
      excerpt: "テスト用引用",
    }),
  ];
  state.extra.support = [row("help", { problemId: "q", question: "条件を確認したい", context: "テスト用答案" })];
  await renderAdmin(root());
  await press("判断を記録");
  expect(state.calls.some((c) => c.path === "reviews" && c.method === "POST")).toBe(false);
  tick("自分で教材と各確認結果を照合した");
  field("根拠・影響・修正案（10文字以上）", "テスト上の確認結果を入力する");
  for (const label of [
    "代表例：別の計算経路での一致",
    "境界条件：初期値・定常値・単位",
    "反例：成立しない条件・誤答の検出",
  ])
    field(label, "テスト用の確認結果");
  field("判断", "保留");
  await press("判断を記録");
  expect(state.calls.find((c) => c.path === "reviews" && c.method === "POST")?.body?.decision).toBe("hold");
  field("問題ID", "q");
  field("問題の版", "v1");
  field("採点観点の名前", "自分の観点");
  tick("自分が採点観点と配点を確認した");
  await press("採点観点を版として保存");
  expect(state.calls.some((c) => c.path === "admin/rubric")).toBe(true);
  field("公式の参照URL", "https://www.shiken.or.jp/");
  field("確認した変更・論点の対応", "適用条件を記録");
  tick("原典を自分で確認した");
  for (const name of ["法規の版", "教材の訂正", "出題範囲の対応"]) {
    field("登録する情報", name);
    await press("確認した情報を登録");
  }
  expect(state.saves.map((s) => s.kind)).toEqual(expect.arrayContaining(["law", "correction", "blueprint"]));
  field("確認結果", "転記候補として確認、問題公開は保留");
  await press("確認済み候補にする");
  expect(state.saves.find((s) => s.kind === "ingest")?.body.status).toBe("reviewed-candidate");
  field("回答・次に確認する点", "成立条件をもう一度確認してください");
  field("採点観点（任意）", "rubric-one テスト用採点観点");
  field("観点IDごとの得点JSON（採点する場合）", '{"conditions":1}');
  await press("確認結果を保存");
  expect(state.calls.find((c) => c.path === "admin/support" && c.method === "POST")?.body).toMatchObject({
    owner: "student",
    expectedRevision: 1,
    rubricId: "rubric-one",
  });
});
