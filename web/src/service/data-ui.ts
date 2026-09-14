import { importBackup } from "../backup.js";
import { catalogue } from "./catalog.js";
import { api, download, records, saveRecord } from "./client.js";
import { cloudStorage, identity } from "./cloud-storage.js";
import { flushAttempts, pendingAttemptsExport } from "./events.js";
import { disclosure, emptyState } from "./study-ui.js";
import { area, button, check, h, input, link, notice, panel, select, table } from "./ui.js";

export async function renderData(root: HTMLElement) {
  await notesPanel(root);
  const images = h("div", {}),
    migration = h("div", {}),
    feedback = h("div", {});
  await imagePanel(images);
  migrationPanel(migration);
  await feedbackPanel(feedback);
  root.append(
    disclosure("手書き答案を保存・確認する", images),
    disclosure("記録の移行・取り込み", migration),
    disclosure("質問の回答・フィードバック", feedback),
  );
  const storage = panel(
    "自分のデータを管理する",
    "学習記録は本人ごとに保存します。保存待ちの内容は端末に残し、再送します。",
  );
  storage.append(
    button("保存待ちを再送", async () => {
      await cloudStorage.flush();
      await flushAttempts();
      notice(storage, "再送を確認しました");
    }),
    button("保存待ちの内容を書き出す", () =>
      download(
        "DENKEN-pending.json",
        JSON.stringify({ ...cloudStorage.pendingExport(), attempts: pendingAttemptsExport() }, null, 2),
      ),
    ),
    button("学習記録をすべて書き出す", async () => {
      const data = await api<unknown>("export");
      download("DENKEN-service-backup.json", JSON.stringify(data, null, 2));
      notice(
        storage,
        "教材・画像のバイトデータは別途保持してください。バックアップには学習記録と画像の参照情報が含まれます。",
      );
    }),
  );
  const consent = input("削除する場合は「学習記録を削除」と入力");
  storage.append(
    h(
      "details",
      {},
      h("summary", {}, "記録の削除"),
      h(
        "p",
        {},
        "自分の答案、ノート、設定、画像、使用量を削除します。教材の監修履歴と所有者権限は、教材の来歴と権限保護のため保持します。必要な記録を先に書き出してください。",
      ),
      consent.field,
      button("自分の学習記録を削除", async () => {
        if (consent.input.value !== "学習記録を削除") throw new Error("確認文字を入力してください");
        await api("account", "DELETE", { confirm: consent.input.value });
        cloudStorage.reset();
        if (identity) {
          localStorage.removeItem(`denken:attemptQueue:${identity.id}`);
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (
              key?.startsWith(`denken:examDraft:${identity.id}:`) ||
              key?.startsWith(`denken:readReplica:${identity.id}:`)
            )
              localStorage.removeItem(key);
          }
          for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (key?.startsWith(`denken:studyDraft:${identity.id}:`)) sessionStorage.removeItem(key);
          }
        }
        notice(storage, "学習記録を削除しました。画面を再読み込みしてください。");
      }),
    ),
  );
  root.append(disclosure("バックアップ・保存待ち・データ管理", storage));
}
async function notesPanel(root: HTMLElement) {
  const wrap = panel("学習ノート");
  const topic = input("論点"),
    text = area("自分の説明・気づいたこと"),
    cause = select("つまずき", [
      "不明",
      "知識",
      "式の選択",
      "前提条件",
      "単位",
      "係数",
      "計算",
      "読み落とし",
      "時間不足",
    ]);
  const rows = await records("note"),
    list = h("div", {});
  const search = input("ノートを検索");
  search.input.type = "search";
  search.input.placeholder = "論点や気づいたことで検索";
  const render = () => {
    list.replaceChildren();
    const found = rows.items.filter((r) =>
      JSON.stringify(r.body).toLocaleLowerCase().includes(search.input.value.toLocaleLowerCase()),
    );
    if (!found.length)
      list.append(
        emptyState(
          rows.items.length ? "該当するノートがありません" : "気づきを一つ、残しておきましょう",
          rows.items.length
            ? "キーワードを変えて探してみてください。"
            : "演習の解説から、間違いの原因や次に気をつけることを保存できます。",
        ),
      );
    for (const row of found) {
      const b = row.body;
      const card = panel(String(b.topic ?? b.type ?? "ノート"));
      card.append(
        h("p", { class: "lab-prose" }, String(b.text || b.reason || b.answer || "")),
        h(
          "p",
          { class: "muted" },
          [b.cause, new Date(row.updated_at).toLocaleDateString("ja-JP")].filter(Boolean).join(" · "),
        ),
      );
      const edit = area("追記・修正", String(b.text ?? ""));
      let revision = row.revision;
      card.append(
        disclosure(
          "ノートを編集・書き出す",
          edit.field,
          button("ノートを更新", async () => {
            const result = await saveRecord("note", row.id, { ...b, text: edit.input.value }, revision);
            revision = result.revision;
            row.revision = result.revision;
            b.text = edit.input.value;
            const text = card.querySelector<HTMLElement>(".lab-prose");
            if (text) text.textContent = edit.input.value;
            notice(card, "更新しました");
          }),
          button("Markdownで書き出す", () =>
            download(
              `DENKEN-note-${row.id}.md`,
              `# ${b.topic ?? "学習ノート"}\n\n問題: ${b.problemId ?? ""}\n版: ${b.revision ?? ""}\n\n${edit.input.value}\n\n自分の答案: ${b.answer ?? ""}\n原因: ${b.cause ?? ""}`,
              "text/markdown",
            ),
          ),
          h("p", { class: "lab-meta" }, [b.problemId, b.revision].filter(Boolean).join(" ／ ")),
        ),
      );
      list.append(card);
    }
  };
  const composer = disclosure(
    "新しいノートを書く",
    topic.field,
    text.field,
    cause.field,
    button(
      "ノートを追加",
      async () => {
        if (!text.input.value.trim()) throw new Error("内容を入力してください");
        const data = {
          topic: topic.input.value,
          text: text.input.value,
          cause: cause.input.value,
          createdAt: Date.now(),
        };
        const id = crypto.randomUUID();
        const saved = await saveRecord("note", id, data);
        rows.items.unshift({ id, revision: saved.revision, body: data, updated_at: Date.now() });
        text.input.value = "";
        render();
      },
      true,
    ),
  );
  search.input.oninput = render;
  wrap.append(search.field, composer, list);
  root.append(wrap);
  render();
  const corrections = await records("correction");
  const digest = panel("教材の訂正情報", "学習した問題に関わる訂正は、問題版と修正理由を確認して再学習へ戻ります。");
  digest.append(
    table(
      ["問題・版", "変更理由", "再確認する内容"],
      corrections.items.map((r) => [
        String(r.body.problemId ?? ""),
        String(r.body.reason ?? ""),
        String(r.body.text ?? ""),
      ]),
    ),
  );
  if (!corrections.items.length) notice(digest, "登録された訂正情報はありません。");
  root.append(disclosure("教材の訂正情報を確認する", digest));
}
async function imagePanel(root: HTMLElement) {
  const wrap = panel(
    "手書き答案を確認する",
    "画像は本人用に保存し、30日後に参照できなくなります。認識結果は、本人が式と記号を確認してから採点補助に渡します。",
  );
  const problem = select(
    "参照する問題",
    catalogue.map((p) => `${p.id} ${p.topic}`),
  );
  const file = input("答案画像（PNG・JPEG・WebP、5MB以内）", "", "file");
  file.input.accept = "image/png,image/jpeg,image/webp";
  const text = area("読み取った式・答案（手入力でも可）"),
    confirmed = check("画像と照合し、式・単位・記号を確認した"),
    preview = h("div", {});
  let assetId = "";
  wrap.append(
    problem.field,
    file.field,
    button("画像を保存して表示", async () => {
      if (!identity?.id) throw new Error("本人確認が必要です。接続を確認してください。");
      const image = file.input.files?.[0];
      if (!image) throw new Error("画像を選んでください");
      if (image.size > 5_000_000) throw new Error("画像は5MB以内にしてください");
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "content-type": image.type, "x-denken-owner": identity.id },
        body: image,
        credentials: "same-origin",
      });
      const data = (await response.json()) as { id?: string; url?: string; error?: string };
      if (!response.ok || !data.id || !data.url) throw new Error(data.error ?? "保存できませんでした");
      assetId = data.id;
      preview.replaceChildren(
        h("img", { src: data.url, alt: "保存した手書き答案", class: "lab-answer-image" }),
        link("画像を別画面で確認・保存", data.url),
      );
    }),
    preview,
    button("画像から文字を読み取る", async () => {
      if (!assetId) throw new Error("先に画像を保存してください");
      const result = await api<{ text: string; configured: boolean }>("ocr", "POST", { assetId });
      text.input.value = result.text;
      if (!result.configured) notice(wrap, "画像認識の外部接続は未設定です。画像を見ながら入力できます。");
      confirmed.input.checked = false;
    }),
    text.field,
    confirmed.field,
    button("確認した答案を保存", async () => {
      if (!confirmed.input.checked) throw new Error("画像と式・記号を照合してください");
      if (!text.input.value.trim()) throw new Error("答案を入力してください");
      const p = catalogue.find((p) => `${p.id} ${p.topic}` === problem.input.value);
      await saveRecord("note", crypto.randomUUID(), {
        type: "handwriting",
        assetId,
        problemId: p?.id,
        revision: p?.revision,
        text: text.input.value,
        confirmed: true,
        createdAt: Date.now(),
      });
      notice(wrap, "確認した答案を保存しました");
    }),
    button("この画像を削除", async () => {
      if (!assetId) throw new Error("対象の画像がありません");
      await api(`assets/${assetId}`, "DELETE");
      assetId = "";
      preview.replaceChildren();
      notice(wrap, "画像を削除しました");
    }),
  );
  root.append(wrap);
}
function migrationPanel(root: HTMLElement) {
  const wrap = panel(
    "旧サイト・別環境から記録を移す",
    "旧サイトの設定からバックアップJSONを書き出し、ここで内容を確認して取り込みます。元ファイルは復元用に保持してください。",
  );
  const file = input("バックアップJSON", "", "file");
  file.input.accept = ".json,application/json";
  const preview = h("div", {});
  let prepared: Record<string, string> | null = null;
  let serviceBackup: unknown = null;
  wrap.append(
    file.field,
    button("取り込み内容を確認", async () => {
      const selected = file.input.files?.[0];
      if (!selected) throw new Error("ファイルを選んでください");
      if (selected.size > 8_000_000) throw new Error("この取込画面では8MB以内のJSONを使用してください");
      const source = JSON.parse(await selected.text()) as {
        app?: string;
        version?: number;
        data?: Record<string, string>;
        records?: unknown[];
        attempts?: unknown[];
      };
      prepared = null;
      serviceBackup = null;
      preview.replaceChildren();
      if (source.app === "denken-os-service") {
        if (source.version !== 1 || !Array.isArray(source.records) || !Array.isArray(source.attempts))
          throw new Error("対応していない形式です");
        serviceBackup = source;
        notice(
          preview,
          `記録 ${source.records.length}件 ／ 答案 ${source.attempts.length}件。既存の同じIDは上書きせず、競合を報告します。`,
        );
        return;
      }
      const values: Record<string, string> = {};
      const result = importBackup(
        {
          getItem: (k) => values[k] ?? null,
          setItem: (k, v) => {
            values[k] = v;
          },
          removeItem: (k) => {
            delete values[k];
          },
        },
        JSON.stringify(source),
      );
      if (!result.ok) throw new Error(result.reason);
      prepared = Object.fromEntries(
        Object.entries(values).filter(([key]) => !/apiKey|secret|token|license/i.test(key)),
      );
      preview.append(
        table(
          ["記録", "文字数"],
          Object.entries(prepared).map(([key, value]) => [key, value.length]),
        ),
        h(
          "p",
          {},
          "同じキーの学習状態を取り込み内容で更新します。直前の状態を別のバックアップとして残します。APIキー・ライセンスは移しません。",
        ),
      );
    }),
    preview,
    button(
      "確認した内容を取り込む",
      async () => {
        if (serviceBackup) {
          const result = await api<{ imported: number; conflicts: string[]; skipped: string[]; note: string }>(
            "import",
            "POST",
            serviceBackup,
          );
          notice(
            preview,
            `${result.imported}件を取り込みました。競合 ${result.conflicts.length}件、移行対象外 ${result.skipped.length}件。${result.note}`,
          );
          if (result.conflicts.length) preview.append(h("pre", {}, result.conflicts.join("\n")));
          return;
        }
        if (!prepared) throw new Error("先に内容を確認してください");
        await cloudStorage.flush();
        await saveRecord("legacy", `before-import-${Date.now()}`, { data: cloudStorage.pendingExport().data });
        for (const [key, value] of Object.entries(prepared)) cloudStorage.setItem(key, value);
        await cloudStorage.flush();
        notice(
          preview,
          `${Object.keys(prepared).length}種類の記録を移しました。反映するには画面を再読み込みしてください。`,
        );
      },
      true,
    ),
  );
  root.append(wrap);
}
async function feedbackPanel(root: HTMLElement) {
  const wrap = panel(
    "学習体験を記録する",
    "操作の詰まりや、支援を外して解けたかを残します。少人数の試用結果だけで合格率の改善を証明しません。",
  );
  const type = select("記録の種類", [
      "操作・アクセシビリティ",
      "学習の効果",
      "継続する理由",
      "困っている質問",
      "音声・図解の改善",
    ]),
    context = input("端末・学習場面"),
    observation = area("実際に起きたこと"),
    proposal = area("変えてほしいこと", "", 2);
  wrap.append(
    type.field,
    context.field,
    observation.field,
    proposal.field,
    button("フィードバックを保存", async () => {
      if (!observation.input.value.trim()) throw new Error("実際に起きたことを入力してください");
      await saveRecord("feedback", crypto.randomUUID(), {
        type: type.input.value,
        context: context.input.value,
        observation: observation.input.value,
        proposal: proposal.input.value,
        createdAt: Date.now(),
      });
      notice(wrap, "フィードバックを保存しました");
    }),
  );
  const support = await records("support");
  wrap.append(
    h("h4", {}, "確認待ちの質問"),
    table(
      ["状態", "問題", "内容", "監修者の回答"],
      support.items.map((r) => [
        String(r.body.status ?? "waiting"),
        String(r.body.problemId ?? ""),
        String(r.body.question ?? ""),
        String(r.body.reply ?? "未回答"),
      ]),
    ),
  );
  root.append(wrap);
}
