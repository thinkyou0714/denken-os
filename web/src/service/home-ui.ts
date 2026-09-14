import { type Attempt, learningMetrics, planSession } from "../../../lib/service/assessment.js";
import { catalogue } from "./catalog.js";
import { allAttempts, api, records, saveRecord } from "./client.js";
import type { LearningOptions } from "./learning-ui.js";
import { disclosure, emptyState, stat } from "./study-ui.js";
import { button, h, notice, panel, percent } from "./ui.js";

type Launch = (options: LearningOptions) => void;
type Schedule = { items: { topic: string; due: boolean; dueMs: number }[] };

export function latestAnswers(attempts: Attempt[]) {
  const latest = new Map<string, Attempt>();
  for (const a of [...attempts].filter((a) => a.mode !== "validation").sort((a, b) => b.finishedAt - a.finishedAt)) {
    if (!latest.has(a.problemId)) latest.set(a.problemId, a);
  }
  return latest;
}

export async function renderToday(root: HTMLElement, launch: Launch, navigate: (id: string) => void) {
  const [history, profiles, schedule] = await Promise.all([
    allAttempts(),
    records<{ minutes?: string; stage?: string; weeklyMinutes?: string }>("profile"),
    api<Schedule>("skills"),
  ]);
  const attempts = history.items,
    latest = latestAnswers(attempts);
  const profile = profiles.items.find((r) => r.id === "profile")?.body;
  let minutes = [5, 15, 45].includes(Number(profile?.minutes)) ? Number(profile?.minutes) : 15;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = attempts.filter((a) => a.mode !== "validation" && a.finishedAt >= start.getTime());
  const due = catalogue.filter((p) => schedule.items.some((s) => s.topic === p.topic && s.due));
  const needsReview = catalogue.filter((p) => {
    const a = latest.get(p.id);
    return a && (a.correct === false || a.hints > 0 || a.revealed);
  });
  const lead = panel("今日の学習", "使える時間を選んで、一問ずつ進めましょう。");
  lead.classList.add("study-start-card");
  const time = h("div", { class: "study-segments", role: "group", "aria-label": "今日の学習時間" });
  const planHost = h("div", {});
  for (const n of [5, 15, 45]) {
    const b = button(`${n}分`, () => {
      minutes = n;
      drawPlan();
    });
    b.dataset.minutes = String(n);
    time.append(b);
  }
  const drawPlan = () => {
    for (const b of time.querySelectorAll<HTMLButtonElement>("button"))
      b.setAttribute("aria-pressed", String(Number(b.dataset.minutes) === minutes));
    const candidates = catalogue.filter(
      (p) =>
        !profile?.stage || (profile.stage === "二次" ? p.exam === "denken2_secondary" : p.exam !== "denken2_secondary"),
    );
    const planned = planSession(
      minutes,
      candidates.map((p) => ({
        id: p.id,
        estimatedMinutes: p.format === "descriptive" ? 15 : 3,
        due: due.some((d) => d.id === p.id),
        weakness: needsReview.some((d) => d.id === p.id) ? 2 : latest.has(p.id) ? 0 : 1,
      })),
    );
    planHost.replaceChildren();
    if (!planned.chosen.length) {
      planHost.append(
        emptyState(
          "この時間枠に収まる課題がありません",
          "時間を長くするか、教材から問題を選べます。",
          button("教材から選ぶ", () => navigate("library")),
        ),
      );
      return;
    }
    const ids = planned.chosen.map((p) => p.id);
    const first = catalogue.find((p) => p.id === ids[0]);
    if (!first) return;
    planHost.append(
      h(
        "div",
        { class: "study-start-line" },
        h(
          "div",
          {},
          h("p", { class: "study-eyebrow" }, `${planned.chosen.length}問 · 約${minutes - planned.remaining}分`),
          h("h3", {}, `${first.subject}・${first.topic}`),
          h(
            "p",
            { class: "muted" },
            planned.chosen[0]?.due
              ? "復習の時期を迎えた内容から始めます。"
              : "確認済みの教材で、解けるところを増やします。",
          ),
        ),
        button("今日の学習を始める", () => launch({ ids, autoStart: true }), true),
      ),
    );
    const list = h("ol", { class: "study-task-list" });
    for (const [i, t] of planned.chosen.entries()) {
      const p = catalogue.find((p) => p.id === t.id);
      if (!p) continue;
      list.append(
        h(
          "li",
          {},
          h("span", { class: "study-step-number", "aria-hidden": "true" }, String(i + 1)),
          h(
            "div",
            {},
            h("strong", {}, p.topic),
            h(
              "p",
              {},
              `${p.subject} · ${t.estimatedMinutes}分 · ${t.due ? "復習の時期" : needsReview.some((d) => d.id === p.id) ? "前回のつまずきを確認" : latest.has(p.id) ? "解き直し" : "まだ回答していない問題"}`,
            ),
          ),
          button("解く", () => launch({ ids: [p.id], autoStart: true })),
        ),
      );
    }
    const more = disclosure(
      "今日の問題を見る・計画を保存",
      list,
      button("この計画を保存", async () => {
        await saveRecord("plan", crypto.randomUUID(), {
          createdAt: Date.now(),
          minutes,
          tasks: planned.chosen,
          status: "planned",
        });
        notice(more, "今日の計画を保存しました");
      }),
    );
    planHost.append(more);
  };
  lead.append(time, planHost);
  root.append(lead);
  drawPlan();
  root.append(
    h(
      "dl",
      { class: "study-stats" },
      stat("今日の回答", `${today.length}問`),
      stat("今日の学習時間", `${Math.round(today.reduce((n, a) => n + (a.finishedAt - a.startedAt) / 60000, 0))}分`),
      stat("初回・ヒントなし", percent(learningMetrics(attempts).unassistedRate), "自力で回答した問題の正答率"),
    ),
  );
  const columns = h("div", { class: "study-home-columns" });
  const review = panel("復習する");
  review.append(
    h(
      "p",
      { class: "study-callout-number" },
      `${new Set([...due, ...needsReview].map((p) => p.id)).size}`,
      h("span", {}, " 問"),
    ),
    h("p", {}, "復習の時期・前回の間違い・ヒントを使った問題を確認できます。"),
    button("復習する問題を見る", () => navigate("review")),
  );
  const subjects = panel("科目から学ぶ");
  const subjectList = h("div", { class: "study-subject-list" });
  for (const subject of [...new Set(catalogue.map((p) => p.subject))]) {
    const pool = catalogue.filter((p) => p.subject === subject);
    const count = pool.filter((p) => latest.has(p.id)).length;
    const b = button(subject, () => launch({ subject }));
    b.replaceChildren(h("strong", {}, subject), h("span", {}, `${count} / ${pool.length}問に回答`));
    subjectList.append(b);
  }
  subjects.append(
    subjectList,
    h("p", { class: "lab-meta" }, "収録済み教材での回答数です。試験範囲の習得率ではありません。"),
  );
  columns.append(review, subjects);
  root.append(columns);
}

export async function renderReviewQueue(root: HTMLElement, launch: Launch) {
  const [history, schedule] = await Promise.all([allAttempts(), api<Schedule>("skills")]);
  const latest = latestAnswers(history.items);
  const filters = ["復習の時期", "間違えた問題", "ヒントを使った問題"];
  let selected = filters[0];
  const tabs = h("div", { class: "study-segments", role: "group", "aria-label": "復習する問題" });
  const content = h("div", {});
  const draw = () => {
    for (const b of tabs.querySelectorAll<HTMLButtonElement>("button"))
      b.setAttribute("aria-pressed", String(b.textContent === selected));
    const pool = catalogue.filter((p) => {
      const a = latest.get(p.id);
      return selected === "復習の時期"
        ? schedule.items.some((s) => s.topic === p.topic && s.due)
        : selected === "間違えた問題"
          ? a?.correct === false
          : !!a && (a.hints > 0 || a.revealed);
    });
    content.replaceChildren();
    if (!pool.length) {
      content.append(
        emptyState(
          "今は該当する問題がありません",
          selected === "復習の時期"
            ? "回答すると、復習の時期に合わせてここに表示します。"
            : "ほかの復習条件を選ぶか、新しい問題へ進めます。",
          button("演習へ進む", () => launch({})),
        ),
      );
      return;
    }
    const wrap = panel(`${pool.length}問の復習`);
    wrap.append(
      button(
        `先頭${Math.min(5, pool.length)}問を復習する`,
        () => launch({ ids: pool.slice(0, 5).map((p) => p.id), mode: "復習", autoStart: true }),
        true,
      ),
    );
    const list = h("ul", { class: "study-task-list" });
    for (const p of pool) {
      const a = latest.get(p.id);
      list.append(
        h(
          "li",
          {},
          h(
            "div",
            {},
            h("strong", {}, p.topic),
            h(
              "p",
              {},
              `${p.subject}${a ? ` · 前回 ${new Date(a.finishedAt).toLocaleDateString("ja-JP")} · ${a.cause === "不明" ? "原因は未記録" : a.cause}` : ""}`,
            ),
          ),
          button("解き直す", () => launch({ ids: [p.id], mode: "復習", autoStart: true })),
        ),
      );
    }
    wrap.append(list);
    content.append(wrap);
  };
  for (const name of filters)
    tabs.append(
      button(name, () => {
        selected = name;
        draw();
      }),
    );
  root.append(tabs, content);
  draw();
}
