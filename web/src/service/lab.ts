import { learningMetrics, planSession } from "../../../lib/service/assessment.js";
import { retentionChecks, skillSummary } from "../../../lib/service/study-tools.js";
import { getExamDate, setExamDate } from "../settings.js";
import { progress, storage } from "../state/app.js";
import { catalogue } from "./catalog.js";
import { allAttempts, api, records, saveRecord } from "./client.js";
import { cloudStorage, identity, syncStatus } from "./cloud-storage.js";
import { renderData } from "./data-ui.js";
import { renderLearning } from "./learning-ui.js";
import { renderLibrary } from "./library-ui.js";
import { renderPaper } from "./paper-ui.js";
import { renderTools } from "./tools-ui.js";
import { button, check, h, input, link, notice, panel, percent, select, table } from "./ui.js";

const TABS = ["今日の計画", "自力演習", "公式年度模試", "図と計算", "教材を探す", "ノート・データ", "監修・運営"];
let tab = "今日の計画";
export function renderLab(root: HTMLElement) {
  root.append(h("h2", {}, "学習ラボ"));
  const status = h("p", { class: "lab-sync", role: "status" }, syncStatus);
  const listener = () => {
    if (!status.isConnected) {
      window.removeEventListener("denken-sync", listener);
      return;
    }
    status.textContent = syncStatus;
  };
  window.addEventListener("denken-sync", listener);
  root.append(status);
  const focus = check("学習に集中する", localStorage.getItem("denken:focus") === "true");
  const applyFocus = () => {
    document.body.dataset.studyFocus = String(focus.input.checked);
    localStorage.setItem("denken:focus", String(focus.input.checked));
  };
  focus.input.onchange = applyFocus;
  applyFocus();
  root.append(focus.field);
  const nav = h("div", { class: "lab-tabs", role: "tablist", "aria-label": "学習ラボの機能" });
  const content = h("div", { class: "lab-content" });
  const show = async (name: string) => {
    tab = name;
    const host = h("div", {});
    content.replaceChildren(host);
    for (const b of nav.querySelectorAll("button")) {
      b.setAttribute("aria-selected", String(b.textContent === name));
      b.tabIndex = b.textContent === name ? 0 : -1;
    }
    try {
      if (name === "今日の計画") await renderOverview(host);
      else if (name === "自力演習") await renderLearning(host);
      else if (name === "公式年度模試") await renderPaper(host);
      else if (name === "図と計算") renderTools(host);
      else if (name === "教材を探す") await renderLibrary(host);
      else if (name === "ノート・データ") await renderData(host);
      else await (await import("./admin-ui.js")).renderAdmin(host);
    } catch (error) {
      notice(host, error instanceof Error ? error.message : "読み込めませんでした", true);
      host.append(button("再試行", () => show(name)));
    }
  };
  const tabs = identity?.role === "owner" || identity?.role === "reviewer" ? TABS : TABS.slice(0, -1);
  for (const name of tabs) {
    const b = button(name, () => show(name));
    b.setAttribute("role", "tab");
    nav.append(b);
  }
  nav.onkeydown = (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const buttons = [...nav.querySelectorAll("button")],
      index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? buttons.length - 1
          : (index + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
    buttons[next]?.click();
  };
  root.append(nav, content);
  void show(tabs.includes(tab) ? tab : (tabs[0] ?? "今日の計画"));
}

async function renderOverview(root: HTMLElement) {
  const response = await allAttempts();
  const attempts = response.items,
    metrics = learningMetrics(attempts);
  const summary = panel(
    "自力で解ける力を確認する",
    "支援の有無と初回回答を区別します。未見候補は、以前に見ていないことを本人が確認して使用します。",
  );
  summary.append(
    table(
      ["指標", "結果"],
      [
        ["初回・ヒントなしの正答率", percent(metrics.unassistedRate)],
        ["未見候補の正答率", percent(metrics.holdoutRate)],
        ["初回・ヒントなしの回答数", metrics.unassistedCount],
        ["支援ありの回答数", metrics.assistedCount],
        ["記録した学習時間", `${Math.round(metrics.minutes)}分`],
      ],
    ),
  );
  root.append(summary);
  const settings = panel("対象試験と学習時間");
  const rows = await records<{
    exam: string;
    stage: string;
    year: string;
    minutes: string;
    weeklyMinutes: string;
    exemptions: string;
    exemptionStatus: string;
    exemptionUntil?: string;
    delivery?: string;
  }>("profile");
  const current = rows.items.find((r) => r.id === "profile"),
    value = current?.body;
  const exam = select("試験区分", ["二種", "三種（教材拡張待ち）"], value?.exam ?? "二種");
  const stage = select("対策する段階", ["一次", "二次"], value?.stage ?? "一次");
  const year = input("受験する年度", value?.year ?? "2027", "number");
  const date = input("試験日（未公表なら空欄）", getExamDate(storage), "date");
  const minutes = select("今日の時間枠", ["5", "15", "45"], value?.minutes ?? "15");
  const weekly = input("週に使える時間（分）", value?.weeklyMinutes ?? "", "number");
  const exemptions = input("免除・科目合格の記録", value?.exemptions ?? "");
  const exemptionUntil = input("公式通知の免除期限", value?.exemptionUntil ?? "", "date");
  const delivery = select("受験方式", ["筆記", "CBT（三種の拡張用）"], value?.delivery ?? "筆記");
  const confirmation = select(
    "結果の確認状況",
    ["未確定・自己採点", "公式結果を確認済み"],
    value?.exemptionStatus ?? "未確定・自己採点",
  );
  settings.append(
    h(
      "div",
      { class: "lab-grid" },
      exam.field,
      stage.field,
      year.field,
      date.field,
      minutes.field,
      weekly.field,
      exemptions.field,
      confirmation.field,
      exemptionUntil.field,
      delivery.field,
    ),
    link("公式の試験概要と免除制度を確認", "https://www.shiken.or.jp/chief/second/overview/"),
  );
  let profileRevision = current?.revision ?? 0;
  settings.append(
    button(
      "学習条件を保存",
      async () => {
        const data = {
          exam: exam.input.value,
          stage: stage.input.value,
          year: year.input.value,
          minutes: minutes.input.value,
          weeklyMinutes: weekly.input.value,
          exemptions: exemptions.input.value,
          exemptionStatus: confirmation.input.value,
          exemptionUntil: exemptionUntil.input.value,
          delivery: delivery.input.value,
        };
        const saved = await saveRecord("profile", "profile", data, profileRevision);
        profileRevision = saved.revision;
        setExamDate(storage, date.input.value);
        progress.setExamDate(date.input.value || null);
        await cloudStorage.flush();
        notice(settings, "学習条件を保存しました");
      },
      true,
    ),
  );
  root.append(settings);
  const recentMinutes = attempts
    .filter((a) => a.mode !== "validation" && a.finishedAt >= Date.now() - 7 * 86400000)
    .reduce((n, a) => n + (a.finishedAt - a.startedAt) / 60000, 0);
  const targetMinutes = Number(weekly.input.value) || 0;
  const pace = panel("週の予定と実績");
  notice(
    pace,
    `直近7日 ${Math.round(recentMinutes)}分 ／ 週の目標 ${targetMinutes || "未設定"}分。目標まで ${Math.max(0, Math.ceil(targetMinutes - recentMinutes))}分。`,
  );
  pace.append(
    button("次の7日の時間配分を保存", async () => {
      const perDay = targetMinutes ? Math.ceil(targetMinutes / 7) : 15;
      await saveRecord("plan", crypto.randomUUID(), {
        type: "weekly-adjustment",
        targetMinutes,
        recentMinutes,
        perDay,
        createdAt: Date.now(),
      });
      notice(pace, `次の7日は1日約${perDay}分を目安にしました。実行できる日数に応じて時間枠を選んでください。`);
    }),
  );
  root.append(pace);
  const skills = skillSummary(attempts);
  const next = panel("次の学習", "復習と苦手な技能を優先し、設定した時間に収まる課題を提案します。");
  const schedule = await api<{ items: { topic: string; skill: string; due: boolean; dueMs: number }[] }>("skills");
  const tasks = catalogue.map((p) => ({
    id: p.id,
    estimatedMinutes: p.format === "descriptive" ? 15 : 3,
    due: schedule.items.some((s) => s.topic === p.topic && s.due),
    weakness:
      1 -
      (skills.find((s) => s.topic === p.topic)?.correct ?? 0) /
        Math.max(1, skills.find((s) => s.topic === p.topic)?.count ?? 1),
  }));
  const planned = planSession(Number(minutes.input.value), tasks);
  next.append(
    table(
      ["問題", "内容", "目安", "理由"],
      planned.chosen.map((t) => {
        const p = catalogue.find((p) => p.id === t.id);
        return [t.id, p?.topic ?? "", `${t.estimatedMinutes}分`, t.due ? "復習期日" : "未確認・弱点の確認"];
      }),
    ),
  );
  if (!planned.chosen.length) notice(next, "この時間枠に収まる課題がありません。短い復習か、時間枠の変更を選べます。");
  notice(next, `時間枠の残り ${planned.remaining}分 ／ 期日を迎えた積み残し ${planned.backlog}件`);
  next.append(
    button("今日の計画として保存", async () => {
      await saveRecord("plan", crypto.randomUUID(), {
        createdAt: Date.now(),
        minutes: Number(minutes.input.value),
        tasks: planned.chosen,
        status: "planned",
      });
      notice(next, "計画を保存しました");
    }),
  );
  root.append(next);
  const review = panel("技能と定着");
  review.append(
    table(
      ["論点", "技能", "自力正答", "回答数"],
      skills.map((s) => [s.topic, s.skill, `${s.correct}/${s.count}`, s.count]),
    ),
  );
  const delayed = retentionChecks(attempts);
  review.append(
    h("h4", {}, "7日以上空けた再回答"),
    table(
      ["系列", "間隔", "結果"],
      delayed.map((r) => [r.family, `${r.days}日`, r.correct ? "正答" : "要復習"]),
    ),
  );
  if (!delayed.length)
    notice(review, "まだ比較できる再回答がありません。7日を最適な復習間隔と固定するものではありません。");
  const latest = attempts[0];
  if (latest && Date.now() - latest.finishedAt > 7 * 86400000)
    notice(review, "前回から間が空いています。短い確認問題から再開し、結果に応じて今日の量を調整してください。");
  root.append(review);
}
