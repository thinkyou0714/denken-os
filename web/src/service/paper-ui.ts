import type { Paper } from "../../../lib/service/assessment.js";
import { api, download, records, type StoredRecord, saveRecord } from "./client.js";
import { identity } from "./cloud-storage.js";
import { disclosure, focusHeading } from "./study-ui.js";
import { button, check, h, input, link, notice, panel, select, table } from "./ui.js";

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
  flagged?: string[];
  finished?: boolean;
}
export async function renderPaper(root: HTMLElement) {
  const [{ papers }, saved] = await Promise.all([api<{ papers: Paper[] }>("catalog"), records<Session>("exam")]);
  const intro = panel("科目を選んで始める");
  const chooser = select(
    "年度・科目",
    papers.map((p) => p.title),
  );
  const mode = select("学習モード", ["本番モード", "時間制限なしの練習"]);
  const work = h("div", {});
  const open = async (paper: Paper, record: StoredRecord<Session>) => {
    intro.hidden = true;
    resume.hidden = true;
    work.replaceChildren();
    work.append(
      button("模試一覧に戻る", async () => {
        root.replaceChildren();
        await renderPaper(root);
      }),
    );
    await examWorkspace(work, paper, record);
    if (work.isConnected) focusHeading(work.querySelector("h3"));
  };
  const paperCards = h("div", { class: "study-paper-cards", role: "group", "aria-label": "受験する科目" });
  for (const p of papers) {
    const b = button(p.title, () => {
      chooser.input.value = p.title;
      updateChoice();
    });
    b.dataset.paper = p.id;
    b.replaceChildren(
      h("span", { class: "lab-meta" }, `${p.source.year ?? ""}年度`),
      h("strong", {}, p.subject),
      h("span", {}, `${p.durationMinutes}分`),
    );
    paperCards.append(b);
  }
  const updateChoice = () => {
    for (const b of paperCards.querySelectorAll<HTMLButtonElement>("button"))
      b.setAttribute(
        "aria-pressed",
        String(papers.find((p) => p.title === chooser.input.value)?.id === b.dataset.paper),
      );
  };
  chooser.input.onchange = updateChoice;
  intro.append(
    paperCards,
    disclosure("年度を一覧から選ぶ", chooser.field),
    mode.field,
    h(
      "p",
      { class: "muted" },
      "本番モードは、画面を閉じても制限時間が進みます。初めて使うときは時間制限なしでも練習できます。",
    ),
    button(
      "この科目を始める",
      async () => {
        const paper = papers.find((p) => p.title === chooser.input.value);
        if (!paper) return;
        const session = await api<StoredRecord<Session>>("exam/start", "POST", {
          paperId: paper.id,
          mode: mode.input.value === "本番モード" ? "exam" : "practice",
        });
        await open(paper, session);
      },
      true,
    ),
  );
  const resume = h("div", {});
  const unfinished = saved.items.filter((r) => !r.body.finished),
    finished = saved.items.filter((r) => r.body.finished);
  const sessionList = (sessions: StoredRecord<Session>[]) => {
    const list = h("ul", { class: "study-saved-exams" });
    for (const record of sessions.slice(0, 12)) {
      const paper = papers.find((p) => p.id === record.body.paperId);
      if (!paper) continue;
      list.append(
        h(
          "li",
          {},
          h(
            "div",
            {},
            h("strong", {}, paper.title),
            h(
              "p",
              { class: "lab-meta" },
              `${new Date(record.body.startedAt).toLocaleString("ja-JP")} · ${record.body.mode === "exam" ? "本番モード" : "練習"}`,
            ),
          ),
          button(record.body.finished ? "結果を見る" : "続きから開く", () => open(paper, record)),
        ),
      );
    }
    return list;
  };
  if (unfinished.length) {
    const card = panel("途中の模試を再開する");
    card.append(sessionList(unfinished));
    resume.append(card);
  }
  if (finished.length) resume.append(disclosure("これまでの模試結果", sessionList(finished)));
  root.append(resume, intro, work);
  updateChoice();
}

async function examWorkspace(root: HTMLElement, paper: Paper, record: StoredRecord<Session>) {
  let session = structuredClone(record.body),
    revision = record.revision,
    changed = false;
  session.flagged ??= [];
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
          flagged: draft.session.flagged ?? session.flagged,
        };
        changed = true;
      } else notice(root, "別の端末で更新されています。保存待ちの答案を書き出して比較できます。");
    } catch {
      notice(root, "保存待ちの答案を読み取れません。データ管理から保管してください。");
    }
  }
  let saving: Promise<void> | null = null,
    scheduled: ReturnType<typeof setTimeout> | null = null;
  let current = 0;
  const wrap = panel(paper.title);
  wrap.classList.add("study-exam-workspace");
  const clock = h("p", { class: "lab-clock", role: "timer" });
  const saveState = h("p", { class: "study-save-state", role: "status" }, "保存済み");
  const progress = h("p", { class: "study-paper-progress" });
  const tools = h("div", { class: "lab-actions" });
  if (pending)
    tools.append(button("保存待ちの答案を書き出す", () => download(`DENKEN-pending-${record.id}.json`, pending)));
  const source = h("section", { class: "study-paper-source", "aria-label": "公式問題PDF" });
  const iframe = h(
    "object",
    {
      data: `${paper.questionPdf}#page=${paper.groups[0]?.page ?? 1}`,
      type: "application/pdf",
      class: "lab-pdf",
      "aria-label": `${paper.title}の公式問題`,
    },
    link("PDFを別画面で開く", paper.questionPdf),
  );
  const pdfLink = link("問題PDFを別画面で開く", `${paper.questionPdf}#page=${paper.groups[0]?.page ?? 1}`);
  source.append(h("div", { class: "study-pdf-heading" }, h("strong", {}, "公式問題"), pdfLink), iframe);
  const sheet = h("div", { class: "lab-answer-sheet" });
  const navigator = h("div", { class: "study-question-nav", role: "group", "aria-label": "大問を選ぶ" });
  const paperPanes = h("div", { class: "study-paper-panes", "data-pane": "answer" });
  const answers = h("section", { class: "study-paper-answers", "aria-label": "解答用紙" }, sheet);
  const resultHost = h("div", { class: "study-paper-results" });
  const reviewHost = h("div", {});
  const activeGroups = () => paper.groups.filter((g) => !g.selectionGroup || session.selected.includes(g.id));
  const remaining = () =>
    activeGroups()
      .flatMap((g) => g.blanks)
      .filter((b) => !session.answers[b.id]);
  const invalid = () =>
    paper.selections.filter(
      (s) =>
        paper.groups.filter((g) => g.selectionGroup === s.id && session.selected.includes(g.id)).length !== s.count,
    );
  const save = async (): Promise<void> => {
    if (saving) {
      await saving;
      if (changed) await save();
      return;
    }
    if (!changed || session.finished) return;
    const snapshot = structuredClone(session);
    changed = false;
    saveState.textContent = "保存中…";
    saving = (async () => {
      try {
        const saved = await saveRecord("exam", record.id, snapshot, revision);
        revision = saved.revision;
        saveState.textContent = "保存済み";
        if (!changed) localStorage.removeItem(draftKey);
      } catch (error) {
        changed = true;
        saveState.textContent = error instanceof Error ? error.message : "保存できません。入力は端末に残っています。";
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
  const updateNavigation = () => {
    const total = activeGroups().flatMap((g) => g.blanks).length;
    progress.textContent = `${total - remaining().length} / ${total}欄に回答${invalid().length ? " · 選択大問を選んでください" : ""}`;
    for (const [i, b] of [...navigator.querySelectorAll<HTMLButtonElement>("button")].entries()) {
      const group = paper.groups[i];
      if (!group) continue;
      const count = group.blanks.filter((v) => !!session.answers[v.id]).length;
      b.replaceChildren(
        h("strong", {}, group.title),
        h("span", {}, `${count}/${group.blanks.length}${session.flagged?.includes(group.id) ? " · 見直し" : ""}`),
      );
      b.setAttribute("aria-pressed", String(i === current));
      b.dataset.answered = String(count === group.blanks.length);
    }
  };
  const schedule = () => {
    if (session.finished) return;
    changed = true;
    localStorage.setItem(draftKey, JSON.stringify({ session, revision }));
    saveState.textContent = "端末に保存・同期待ち";
    updateNavigation();
    if (scheduled) clearTimeout(scheduled);
    scheduled = setTimeout(() => {
      void save().catch(() => {});
    }, 250);
  };
  const expired = () => session.mode === "exam" && Date.now() > session.deadline;
  const refreshClock = () => {
    const left = Math.max(0, Math.floor((session.deadline - Date.now()) / 1000));
    clock.textContent = session.finished
      ? "提出済み"
      : session.mode === "practice"
        ? `経過 ${Math.floor((Date.now() - session.startedAt) / 60000)}分`
        : `残り ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    clock.dataset.urgent = String(!session.finished && session.mode === "exam" && left <= 300);
    if (expired() || session.finished)
      for (const el of sheet.querySelectorAll<HTMLInputElement>("input,select")) el.disabled = true;
  };
  const sections: HTMLElement[] = [];
  const showGroup = (index: number, focus = true) => {
    current = Math.max(0, Math.min(paper.groups.length - 1, index));
    sections.forEach((section, i) => {
      section.hidden = i !== current;
    });
    const group = paper.groups[current];
    if (!group) return;
    iframe.setAttribute("data", `${paper.questionPdf}#page=${group.page ?? 1}`);
    pdfLink.setAttribute("href", `${paper.questionPdf}#page=${group.page ?? 1}`);
    if (focus && !session.finished && !expired()) {
      session.visited.push({ group: group.id, at: Date.now() });
      schedule();
    }
    updateNavigation();
    if (focus && sheet.isConnected)
      focusHeading(
        paperPanes.dataset.pane === "source"
          ? navigator.querySelectorAll("button")[current]
          : sections[current]?.querySelector("legend"),
      );
  };
  for (const [i, group] of paper.groups.entries()) {
    navigator.append(button(group.title, () => showGroup(i)));
    const section = h("fieldset", { class: "lab-question" }, h("legend", {}, group.title));
    if (group.selectionGroup) {
      const chosen = check(`${group.title}を解答する（選択大問）`, session.selected.includes(group.id));
      chosen.input.onchange = () => {
        if (expired() || session.finished) return;
        const groupId = group.selectionGroup,
          limit = paper.selections.find((s) => s.id === groupId)?.count ?? 1;
        session.selected = session.selected.filter(
          (id) =>
            id !== group.id && (limit !== 1 || !paper.groups.some((g) => g.id === id && g.selectionGroup === groupId)),
        );
        if (chosen.input.checked) session.selected.push(group.id);
        for (const other of sheet.querySelectorAll<HTMLInputElement>("input[data-option]"))
          if (other !== chosen.input) other.checked = session.selected.includes(other.dataset.option ?? "");
        schedule();
      };
      chosen.input.dataset.option = group.id;
      section.append(
        chosen.field,
        h("p", { class: "lab-meta" }, "選択した大問だけを採点します。問題PDFの選択条件を確認してください。"),
      );
    }
    section.append(h("p", { class: "lab-meta" }, `問題PDF ${group.page ?? 1}ページを見て回答してください。`));
    const row = h("div", { class: "lab-blanks" });
    for (const blank of group.blanks) {
      const field = select(
        `${group.title} ${blank.label}（${blank.points}点）`,
        ["未回答", ...(blank.choices ?? group.choices)],
        session.answers[blank.id] ?? "未回答",
      );
      const label = field.field.querySelector("span");
      if (label) label.textContent = `${blank.label} · ${blank.points}点`;
      field.input.dataset.blank = blank.id;
      field.input.onchange = () => {
        if (expired() || session.finished) return;
        if (field.input.value === "未回答") delete session.answers[blank.id];
        else session.answers[blank.id] = field.input.value;
        schedule();
      };
      row.append(field.field);
    }
    const flag = check("あとで見直す", session.flagged?.includes(group.id));
    flag.input.onchange = () => {
      if (expired() || session.finished) return;
      session.flagged = session.flagged?.filter((id) => id !== group.id) ?? [];
      if (flag.input.checked) session.flagged.push(group.id);
      schedule();
    };
    const reason = input(`${group.title}の方針・選択理由`, session.reasons[group.id] ?? "");
    reason.input.onchange = () => {
      if (expired() || session.finished) return;
      session.reasons[group.id] = reason.input.value;
      schedule();
    };
    section.append(row, flag.field, disclosure("解答方針をメモする", reason.field));
    const prev = button("前の大問", () => showGroup(i - 1)),
      next = button("次の大問", () => showGroup(i + 1));
    prev.disabled = i === 0;
    next.disabled = i === paper.groups.length - 1;
    section.append(h("div", { class: "study-paper-paging" }, prev, next));
    sections.push(section);
    sheet.append(section);
  }
  tools.append(
    button("今すぐ保存", save),
    button("答案を書き出す", () =>
      download(`DENKEN-${record.id}.json`, JSON.stringify({ ...session, paperRevision: paper.revision }, null, 2)),
    ),
    button("答案用紙を印刷", () => window.print()),
  );
  const submit = async () => {
    if (!expired()) await save();
    const late = changed && expired();
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
    reviewHost.replaceChildren();
    resultHost.replaceChildren();
    submitButton.textContent = "結果を表示";
    const card = panel(
      `結果 ${value.result.earned} / ${value.result.possible}点`,
      "公式解答・配点との照合結果です。合否の判定ではありません。",
    );
    if (late) notice(card, "時間切れ後の未保存入力は含めず、保存済み答案を採点しました。");
    if (value.result.invalidSelections.length)
      notice(card, "選択大問の条件を満たしていないため、該当する選択群は得点に含めていません。", true);
    const filter = check("間違い・未回答だけを見る");
    const resultTable = h("div", {});
    const drawResults = () => {
      const rows = value.result.rows.filter((r) => !filter.input.checked || r.earned < r.possible);
      resultTable.replaceChildren(
        table(
          ["解答欄", "あなたの答え", "正答", "得点"],
          rows.map((r) => {
            const group = paper.groups.find((g) => g.blanks.some((b) => b.id === r.id));
            const blank = group?.blanks.find((b) => b.id === r.id);
            return [
              `${group?.title ?? ""} ${blank?.label ?? r.id}`,
              r.given || "未回答",
              r.answer,
              `${r.earned}/${r.possible}`,
            ];
          }),
        ),
      );
      if (!rows.length) notice(resultTable, "該当する解答欄はありません。");
    };
    filter.input.onchange = drawResults;
    drawResults();
    card.append(link("公式解答PDFを確認", paper.answerPdf), filter.field, resultTable);
    const reflection = input("次回の時間配分で変えること");
    card.append(
      disclosure(
        "時間配分を振り返る",
        table(
          ["大問", "開いた時刻（開始から）", "方針"],
          session.visited.map((v) => [
            v.group,
            `${Math.max(0, Math.round((v.at - session.startedAt) / 60000))}分`,
            session.reasons[v.group] ?? "",
          ]),
        ),
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
      ),
    );
    resultHost.append(card);
    if (card.isConnected) focusHeading(card.querySelector("h3"));
  };
  const submitButton = button(
    session.finished ? "結果を表示" : "採点前に回答を確認",
    async () => {
      if (session.finished) {
        await submit();
        return;
      }
      const missing = remaining();
      const confirm = panel("この答案を提出しますか？", "提出後は回答を変更できません。");
      confirm.append(h("p", {}, `未回答 ${missing.length}欄 · 見直しマーク ${session.flagged?.length ?? 0}問`));
      if (invalid().length)
        notice(confirm, "選択大問が未選択、または選択数が合っていません。採点前に確認してください。", true);
      if (missing.length)
        confirm.append(
          button("最初の未回答を確認", () => {
            const i = paper.groups.findIndex((g) => g.blanks.some((b) => b.id === missing[0]?.id));
            setPane("answer");
            showGroup(i);
            reviewHost.replaceChildren();
          }),
        );
      confirm.append(
        button("解答を続ける", () => {
          reviewHost.replaceChildren();
          setPane("answer");
          showGroup(current);
        }),
        button("この答案を提出して採点", submit, true),
      );
      reviewHost.replaceChildren(confirm);
      focusHeading(confirm.querySelector("h3"));
    },
    true,
  );
  const paneButtons = h("div", {
    class: "study-pane-switch study-segments",
    role: "group",
    "aria-label": "模試の表示",
  });
  const setPane = (id: "source" | "answer") => {
    paperPanes.dataset.pane = id;
    for (const other of paneButtons.querySelectorAll<HTMLButtonElement>("button"))
      other.setAttribute("aria-pressed", String(other.dataset.pane === id));
  };
  for (const [id, label] of [
    ["source", "問題PDF"],
    ["answer", "解答用紙"],
  ] as const) {
    const b = button(label, () => setPane(id));
    b.dataset.pane = id;
    b.setAttribute("aria-pressed", String(id === "answer"));
    paneButtons.append(b);
  }
  paperPanes.append(source, answers);
  wrap.append(
    h("div", { class: "study-exam-toolbar" }, clock, progress, saveState),
    navigator,
    paneButtons,
    paperPanes,
    h("div", { class: "study-exam-submit" }, disclosure("保存・印刷・書き出し", tools), submitButton),
    reviewHost,
    resultHost,
    disclosure(
      "出典と利用条件",
      link("公式サイトで原典を確認", paper.source.url ?? "https://www.shiken.or.jp/chief/second/qa/"),
      h("p", {}, paper.source.modified),
    ),
  );
  root.append(wrap);
  showGroup(0, false);
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
