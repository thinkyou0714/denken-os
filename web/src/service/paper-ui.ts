import type { Paper } from "../../../lib/service/assessment.js";
import { api, download, records, type StoredRecord, saveRecord } from "./client.js";
import { identity } from "./cloud-storage.js";
import { button, h, input, link, notice, panel, select, table } from "./ui.js";

interface Session {
  paperId: string;
  revision: string;
  mode: "exam" | "practice";
  startedAt: number;
  deadline: number;
  answers: Record<string, string>;
  selected: string[];
  visited: { group: string; at: number }[];
  reasons: Record<string, string>;
  finished?: boolean;
}
export async function renderPaper(root: HTMLElement) {
  const { papers } = await api<{ papers: Paper[] }>("catalog");
  const intro = panel(
    "公式年度模試",
    "原典の図・式を見ながら、空欄ごとに回答します。本番モードの時計は画面を閉じても進みます。既に見た年度は形式練習として扱ってください。",
  );
  const chooser = select(
    "年度・科目",
    papers.map((p) => p.title),
  );
  const mode = select("時間の扱い", ["本番モード", "時間制限なしの練習"]);
  intro.append(
    chooser.field,
    mode.field,
    button(
      "新しく開始する",
      async () => {
        const paper = papers.find((p) => p.title === chooser.input.value);
        if (!paper) return;
        const session = await api<StoredRecord<Session>>("exam/start", "POST", {
          paperId: paper.id,
          mode: mode.input.value === "本番モード" ? "exam" : "practice",
        });
        work.replaceChildren();
        await examWorkspace(work, paper, session);
      },
      true,
    ),
  );
  root.append(intro);
  const work = h("div", {});
  root.append(work);
  const saved = (await records<Session>("exam")).items;
  for (const session of saved.slice(0, 12)) {
    const paper = papers.find((p) => p.id === session.body.paperId);
    if (!paper) continue;
    intro.append(
      button(
        `${session.body.finished ? "結果" : "再開"}：${paper.title} / ${new Date(session.body.startedAt).toLocaleString("ja-JP")}`,
        async () => {
          work.replaceChildren();
          await examWorkspace(work, paper, session);
        },
      ),
    );
  }
}
async function examWorkspace(root: HTMLElement, paper: Paper, record: StoredRecord<Session>) {
  let session = structuredClone(record.body);
  let revision = record.revision,
    changed = false;
  const draftKey = `denken:examDraft:${identity?.id}:${record.id}`;
  const pending = localStorage.getItem(draftKey);
  if (pending && !session.finished) {
    try {
      const draft = JSON.parse(pending) as { session: Session; revision: number };
      if (draft.revision === revision && draft.session.paperId === session.paperId) {
        session = {
          ...session,
          answers: draft.session.answers,
          selected: draft.session.selected,
          reasons: draft.session.reasons,
          visited: draft.session.visited,
        };
        changed = true;
      } else notice(root, "別の端末の更新があります。端末の保存待ち答案は書き出して比較してください。");
    } catch {
      notice(root, "保存待ち答案を読み取れません。データ管理から保管してください。");
    }
  }

  let saving: Promise<void> | null = null;
  let scheduled: ReturnType<typeof setTimeout> | null = null;
  const wrap = panel(paper.title),
    clock = h("p", { class: "lab-clock", role: "timer" }),
    saveState = h("p", { role: "status" }, "保存済み");
  const controls = h("div", { class: "lab-actions" });
  if (pending)
    controls.append(button("端末の保存待ち答案を保管", () => download(`DENKEN-pending-${record.id}.json`, pending)));
  const source = panel("問題の原典");
  const iframe = h(
    "object",
    { data: paper.questionPdf, type: "application/pdf", class: "lab-pdf", "aria-label": `${paper.title}の公式問題` },
    link("PDFを別画面で開く", paper.questionPdf),
  );
  source.append(
    iframe,
    link("公式サイトで原典を開く", paper.source.url ?? "https://www.shiken.or.jp/chief/second/qa/"),
    h("p", { class: "muted" }, paper.source.modified),
  );
  const answerSheet = h("div", { class: "lab-answer-sheet" });
  const resultHost = h("div", {});
  const save = async () => {
    if (saving) {
      await saving;
      if (changed) await save();
      return;
    }
    if (!changed || session.finished) return;
    const snapshot = structuredClone(session);
    changed = false;
    saveState.textContent = "保存中";
    saving = (async () => {
      try {
        const result = await saveRecord("exam", record.id, snapshot, revision);
        revision = result.revision;
        saveState.textContent = "保存済み";
        if (!changed) localStorage.removeItem(draftKey);
      } catch (error) {
        changed = true;
        saveState.textContent = error instanceof Error ? error.message : "保存に失敗しました";
        throw error;
      }
    })();
    try {
      await saving;
    } finally {
      saving = null;
    }
    if (changed) await save();
  };
  const schedule = () => {
    if (session.finished) return;
    changed = true;
    localStorage.setItem(draftKey, JSON.stringify({ session, revision }));
    saveState.textContent = "保存待ち";
    if (scheduled) clearTimeout(scheduled);
    scheduled = setTimeout(() => {
      void save().catch(() => {});
    }, 250);
  };
  const isExpired = () => session.mode === "exam" && Date.now() > session.deadline;
  const refreshClock = () => {
    if (!wrap.isConnected) return;
    const left = Math.max(0, Math.floor((session.deadline - Date.now()) / 1000));
    clock.textContent = session.finished
      ? "提出済み"
      : session.mode === "practice"
        ? `経過 ${Math.floor((Date.now() - session.startedAt) / 60000)}分`
        : `残り ${Math.floor(left / 60)}分${left % 60}秒`;
    if (isExpired() || session.finished)
      for (const el of answerSheet.querySelectorAll("input,select")) (el as HTMLInputElement).disabled = true;
  };
  for (const group of paper.groups) {
    const section = h("fieldset", { class: "lab-question" }, h("legend", {}, group.title));
    if (group.selectionGroup) {
      const chosen = input(`${group.title}を選択`, "", "checkbox");
      chosen.input.checked = session.selected.includes(group.id);
      chosen.input.onchange = () => {
        const groupId = group.selectionGroup;
        const limit = paper.selections.find((s) => s.id === groupId)?.count ?? 1;
        session.selected = session.selected.filter(
          (id) =>
            id !== group.id && (limit !== 1 || !paper.groups.some((g) => g.id === id && g.selectionGroup === groupId)),
        );
        if (chosen.input.checked) session.selected.push(group.id);
        for (const other of answerSheet.querySelectorAll<HTMLInputElement>("input[data-option]"))
          if (other !== chosen.input) other.checked = session.selected.includes(other.dataset.option ?? "");
        schedule();
      };
      chosen.input.dataset.option = group.id;
      section.append(chosen.field);
    }
    section.append(
      button("この問題のページを開く", () => {
        iframe.setAttribute("data", `${paper.questionPdf}#page=${group.page ?? 1}`);
        session.visited.push({ group: group.id, at: Date.now() });
        schedule();
      }),
      h("p", {}, group.statement),
    );
    const row = h("div", { class: "lab-blanks" });
    for (const blank of group.blanks) {
      const field = select(
        `${group.title} ${blank.label}（${blank.points}点）`,
        ["未回答", ...(blank.choices ?? group.choices)],
        session.answers[blank.id] ?? "未回答",
      );
      field.input.onchange = () => {
        if (isExpired() || session.finished) return;
        if (field.input.value === "未回答") delete session.answers[blank.id];
        else session.answers[blank.id] = field.input.value;
        schedule();
      };
      row.append(field.field);
    }
    section.append(row);
    const reason = input(`${group.title}の方針・選択理由（任意）`, session.reasons[group.id] ?? "");
    reason.input.onchange = () => {
      session.reasons[group.id] = reason.input.value;
      schedule();
    };
    section.append(reason.field);
    answerSheet.append(section);
  }
  controls.append(
    button("今すぐ保存", save),
    button("答案を書き出す", () =>
      download(`DENKEN-${record.id}.json`, JSON.stringify({ ...session, paperRevision: paper.revision }, null, 2)),
    ),
    button("答案用紙を印刷", () => window.print()),
  );
  const submit = async () => {
    if (!isExpired()) await save();
    if (changed && isExpired())
      notice(resultHost, "時間切れ後の未保存入力は採点に含めません。保存済み答案を採点します。");
    const value = await api<{
      result: {
        earned: number;
        possible: number;
        invalidSelections: string[];
        rows: { id: string; given: string; answer: string; earned: number; possible: number }[];
      };
    }>("exam/grade", "POST", {
      paperId: paper.id,
      revision: paper.revision,
      sessionId: record.id,
      answers: session.answers,
      selected: session.selected,
    });
    session.finished = true;
    localStorage.removeItem(draftKey);
    refreshClock();
    resultHost.replaceChildren();
    const card = panel(
      `結果 ${value.result.earned} / ${value.result.possible}点`,
      "公式解答・配点との照合結果です。合否判定や未見の実力評価とは区別します。",
    );
    if (value.result.invalidSelections.length)
      notice(card, "選択大問の選び方が原典の条件を満たしていません。該当する選択群は得点に含めていません。", true);
    card.append(
      table(
        ["空欄", "自分の答え", "正答", "得点"],
        value.result.rows.map((r) => [r.id, r.given || "未回答", r.answer, `${r.earned}/${r.possible}`]),
      ),
      link("公式解答PDFを確認", paper.answerPdf),
    );
    card.append(
      h("h4", {}, "時間配分・見直しの振り返り"),
      table(
        ["大問", "開いた時刻（開始から）", "方針"],
        session.visited.map((v) => [
          v.group,
          `${Math.max(0, Math.round((v.at - session.startedAt) / 60000))}分`,
          session.reasons[v.group] ?? "",
        ]),
      ),
    );
    const reflection = input("次回の時間配分で変えること");
    card.append(
      reflection.field,
      button("振り返りを保存", async () => {
        await saveRecord("note", crypto.randomUUID(), {
          type: "exam-reflection",
          paperId: paper.id,
          revision: paper.revision,
          sessionId: record.id,
          text: reflection.input.value,
        });
        notice(card, "振り返りを保存しました");
      }),
    );
    resultHost.append(card);
  };
  controls.append(button(session.finished ? "結果を表示" : "保存済み答案を提出して採点", submit, true));
  wrap.append(clock, saveState, controls, source, answerSheet, resultHost);
  root.append(wrap);
  refreshClock();
  const timer = setInterval(() => {
    if (!wrap.isConnected) {
      clearInterval(timer);
      return;
    }
    refreshClock();
  }, 1000);
  if (session.finished) await submit();
}
