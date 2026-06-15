/**
 * views/review.ts — 復習タブの描画。
 */

import { mascotSvg } from "../mascot.js";
import { formatMath } from "../mathfmt.js";
import { dailyReviewBatch, JST_OFFSET_MS, streakStatus } from "../retention.js";
import { dueReviewProblems, mistakeNotebook } from "../review.js";
import { getMascotEnabled, getReviewCap } from "../settings.js";
import { problems, progress, storage } from "../state/app.js";
import { practice, setCombo } from "../state/practice.js";
import { h, safeHtml } from "../ui/dom.js";
import { emptyState } from "../ui/widgets.js";
import { usedFreezeDays } from "./practice.js";
import { switchView } from "./router.js";

export function renderReview(root: HTMLElement): void {
  // ストリーク予兆ナッジ（崩れる前に背中を押す）。デンタマの表情つきで届きやすく。
  const ss = streakStatus(progress.logs(), Date.now(), JST_OFFSET_MS, usedFreezeDays());
  if (ss.state === "at-risk" || ss.state === "broken") {
    if (getMascotEnabled(storage)) {
      root.append(
        h(
          "div",
          { class: `card nudge ${ss.state} mascot` },
          h("div", { class: "mface", html: safeHtml(mascotSvg(ss.state === "at-risk" ? "worried" : "sad", 48)) }),
          h("div", { class: "mbubble" }, ss.message),
        ),
      );
    } else {
      root.append(h("div", { class: `card nudge ${ss.state}` }, h("span", {}, ss.message)));
    }
  }

  // 1日上限でバッチ化（大量の復習による離脱を防ぐ）。
  const allDue = progress.dueTopics();
  const cap = getReviewCap(storage);
  const { batch, overflow, capped } = dailyReviewBatch(allDue, cap);
  const dueProblems = dueReviewProblems(problems, batch);
  const notebook = mistakeNotebook(progress.logs(), problems, 30);

  root.append(h("h2", {}, "復習キュー（期限到来）"));
  if (allDue.length === 0) {
    root.append(
      emptyState(
        "✅",
        "復習はすべて完了",
        "いま期限が来ている論点はありません。学習タブで新しい問題に挑戦しましょう。",
      ),
    );
  } else if (dueProblems.length === 0) {
    // due はあるが対応する問題が手元に無い（topic に問題が紐づかない）レアケース。
    root.append(emptyState("📭", "今日の復習対象の問題が見つかりません", "学習タブで新しい問題に挑戦しましょう。"));
  } else {
    root.append(
      h(
        "p",
        { class: "muted" },
        `今日の復習 ${batch.length} 論点・${dueProblems.length} 問` +
          (capped ? `（期限到来は計 ${allDue.length} 論点。残り ${overflow} は明日以降に回します）` : ""),
      ),
      h(
        "button",
        { class: "primary", type: "button", onclick: () => startDrill(dueProblems) },
        `▶ 復習ドリルを開始（${dueProblems.length}問）`,
      ),
    );
    if (capped) {
      root.append(
        h(
          "p",
          { class: "muted small" },
          `1日の復習上限は ${cap} 件です（設定で変更可）。少しずつ確実に消化するのが定着への近道です。`,
        ),
      );
    }
    const list = h("div", {});
    for (const topic of batch.slice(0, 12)) {
      const v = progress.getCardView(topic);
      list.append(
        h(
          "div",
          { class: "card" },
          h("strong", {}, topic),
          v ? h("span", { class: "muted" }, ` ・ 安定度 ${v.stability.toFixed(1)}日 / lapses ${v.lapses}`) : "",
        ),
      );
    }
    root.append(list);
  }

  root.append(h("h2", {}, "間違いノート"));
  if (notebook.length === 0) {
    root.append(emptyState("📝", "間違いノートは空です", "誤答した問題がここに集まり、ワンタップで再演習できます。"));
  } else {
    root.append(
      h(
        "button",
        { class: "primary", type: "button", onclick: () => startDrill(notebook.map((m) => m.problem)) },
        `▶ 間違いだけ再演習（${notebook.length}問）`,
      ),
    );
    const list = h("div", {});
    for (const m of notebook.slice(0, 15)) {
      list.append(
        h(
          "div",
          { class: "card" },
          h("div", { html: safeHtml(formatMath(m.problem.statement)) }),
          h(
            "div",
            { class: "muted" },
            `${m.problem.subject}・${m.problem.topic} ／ 誤答 ${m.missCount}回 / 試行 ${m.attempts}回`,
          ),
        ),
      );
    }
    root.append(list);
  }
}

import type { Problem } from "../../../lib/engine/schema.js";

export function startDrill(pool: Problem[]): void {
  practice.pool = pool;
  practice.current = null;
  setCombo(0); // 新しいセッションとして仕切り直す
  switchView("practice");
}
