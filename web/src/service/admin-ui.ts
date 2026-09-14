import { capacityPlan, demandSignals, unitEconomics } from "../../../lib/service/study-tools.js";
import { compareModelRuns, EVALUATION_CASES } from "../../../lib/service/tutor-evaluation.js";
import { catalogue } from "./catalog.js";
import { api, download, records, type StoredRecord, saveRecord } from "./client.js";
import { identity } from "./cloud-storage.js";
import { area, button, check, h, input, link, notice, panel, select, table } from "./ui.js";

export async function renderAdmin(root: HTMLElement) {
  if (identity?.role !== "owner" && identity?.role !== "reviewer") {
    notice(root, "監修・運営権限が必要です", true);
    return;
  }
  const nav = panel(
    "監修と運営",
    "新しい教材は、代表例・境界条件・反例を人が確認してから公開します。収集候補は承認操作まで通常学習に入りません。",
  );
  nav.append(link("100案の実装状況と完了条件", "./service/implementation.html"));
  root.append(nav);
  await reviewPanel(root);
  const papers = panel(
    "公式年度の追加",
    "問題PDF・解答PDF・小問・配点・選択条件をそろえ、原典と照合して登録します。更新は別の版として残ります。",
  );
  const file = input("構造化した年度JSON", "", "file"),
    notes = area("原典と照合した内容：小問・正答・配点・選択条件"),
    confirmed = check("原典との一致を自分で確認した");
  file.input.accept = ".json";
  papers.append(
    file.field,
    notes.field,
    confirmed.field,
    button("公式年度を登録", async () => {
      const chosen = file.input.files?.[0];
      if (!chosen || chosen.size > 150000 || !confirmed.input.checked)
        throw new Error("150KB以内の年度JSONと原典の照合が必要です");
      await api("admin/paper", "POST", {
        paper: JSON.parse(await chosen.text()),
        humanConfirmed: true,
        reviewNotes: notes.input.value,
      });
      notice(papers, "年度を登録しました。公式年度模試から利用できます。");
    }),
    link("登録形式の参考（収録済み年度）", "./service/papers.json"),
  );
  root.append(papers);
  await rubricPanel(root);
  await sourcesPanel(root);
  await supportPanel(root);
  await operationsPanel(root);
  const evaluation = panel(
    "AI回答を同じ基準で比較する",
    "モデルごとに同じケースIDで出力を収集します。この検査は構造・参照ID・計算だけを対象とし、説明の内容は人が監修します。",
  );
  const responses = area("出力JSON：model・caseId・responseの配列", "[]", 6),
    results = h("div", {});
  evaluation.append(
    button("固定評価セットを書き出す", () =>
      download("DENKEN-ai-evaluation-cases.json", JSON.stringify(EVALUATION_CASES, null, 2)),
    ),
    responses.field,
    button("出力を検査・記録", async () => {
      const rows = compareModelRuns(JSON.parse(responses.input.value));
      results.replaceChildren(
        table(
          ["モデル", "一致ケース", "不足ケース"],
          rows.map((r) => [r.model, `${r.passed}/${r.cases}`, r.missing]),
        ),
      );
      await saveRecord("experiment", crypto.randomUUID(), { type: "model-evaluation", rows, createdAt: Date.now() });
    }),
    results,
  );
  root.append(evaluation);
}

async function reviewPanel(root: HTMLElement) {
  const wrap = panel("問題の監修・撤回");
  const drafts = await api<{ items: StoredRecord<{ id: string; revision: string; topic: string }>[] }>("content");
  const items = [...catalogue, ...drafts.items.map((r) => r.body)];
  const target = select(
    "審査する問題版",
    items.map((p) => `${p.id}@${p.revision}`),
  );
  const preview = h("pre", { class: "lab-prose" });
  const show = () => {
    const p = items.find((p) => `${p.id}@${p.revision}` === target.input.value);
    preview.textContent = JSON.stringify(p, null, 2);
  };
  target.input.onchange = show;
  show();
  const decision = select("判断", ["保留", "承認", "却下", "撤回"]);
  const reason = area("根拠・影響・修正案（10文字以上）");
  const checks = [
    "代表例：別の計算経路での一致",
    "境界条件：初期値・定常値・単位",
    "反例：成立しない条件・誤答の検出",
  ].map((name) => area(name, "", 2));
  const human = check("自分で教材と各確認結果を照合した");
  wrap.append(
    target.field,
    h("details", {}, h("summary", {}, "審査する教材の内容"), preview),
    decision.field,
    reason.field,
    ...checks.map((c) => c.field),
    human.field,
    button(
      "判断を記録",
      async () => {
        if (!human.input.checked) throw new Error("教材と確認結果の照合が必要です");
        const p = items.find((p) => `${p.id}@${p.revision}` === target.input.value);
        if (!p) throw new Error("審査対象を選んでください");
        const actions: Record<string, string> = { 保留: "hold", 承認: "approve", 却下: "reject", 撤回: "retract" };
        await api("reviews", "POST", {
          target: p.id,
          fingerprint: p.revision,
          decision: actions[decision.input.value],
          reason: reason.input.value,
          humanConfirmed: true,
          cases: checks
            .filter((c) => c.input.value.trim())
            .map((c) => ({ name: c.input.getAttribute("aria-label"), result: c.input.value })),
        });
        notice(wrap, "判断を記録しました。通常学習の教材一覧は再読み込みで更新されます。");
      },
      true,
    ),
    button("審査用資料を書き出す", () =>
      download(
        "DENKEN-review-packet.json",
        JSON.stringify(
          {
            target: items.find((p) => `${p.id}@${p.revision}` === target.input.value),
            checks: checks.map((c) => ({ name: c.input.getAttribute("aria-label"), result: c.input.value })),
            reason: reason.input.value,
          },
          null,
          2,
        ),
      ),
    ),
  );
  const upload = input("新しい問題JSON（修正も別の版として登録）", "", "file");
  upload.input.accept = ".json";
  wrap.append(
    upload.field,
    button("機械検証して監修待ちに登録", async () => {
      const file = upload.input.files?.[0];
      if (!file || file.size > 150000) throw new Error("150KB以内の問題JSONを選んでください");
      await api("content", "POST", JSON.parse(await file.text()));
      notice(wrap, "監修待ちに登録しました。内容と確認結果をそろえてから審査してください。");
    }),
    link("テンプレートごとの監修台帳", "./service/template-supervision.json"),
  );
  const history = await api<{
    items: { target: string; fingerprint: string; decision: string; reason: string; created_at: number }[];
  }>("reviews");
  wrap.append(
    table(
      ["問題", "版", "判断", "理由"],
      history.items.map((r) => [r.target, r.fingerprint.slice(0, 12), r.decision, r.reason]),
    ),
  );
  root.append(wrap);
}

async function rubricPanel(root: HTMLElement) {
  const wrap = panel(
    "二次答案の採点観点",
    "採点観点を人が定義し、確認依頼への回答時に使います。自動採点による公式得点の推定には使用しません。",
  );
  const target = input("問題ID"),
    revision = input("問題の版"),
    title = input("採点観点の名前");
  const criteria = area(
    "観点JSON：id、label、max、reason",
    JSON.stringify(
      [
        { id: "conditions", label: "前提と条件", max: 2, reason: "成立条件を答案で示している" },
        { id: "equation", label: "式の選択", max: 3, reason: "既知量と未知量を結ぶ妥当な式" },
        { id: "result", label: "計算・単位・結論", max: 3, reason: "途中式と単位が整合する" },
      ],
      null,
      2,
    ),
  );
  const confirmed = check("自分が採点観点と配点を確認した");
  wrap.append(
    target.field,
    revision.field,
    title.field,
    criteria.field,
    confirmed.field,
    button("採点観点を版として保存", async () => {
      if (!confirmed.input.checked) throw new Error("採点観点の確認が必要です");
      await api("admin/rubric", "POST", {
        problemId: target.input.value,
        problemRevision: revision.input.value,
        title: title.input.value,
        criteria: JSON.parse(criteria.input.value),
        humanConfirmed: true,
      });
      notice(wrap, "採点観点を保存しました");
    }),
  );
  const saved = await records("rubric");
  wrap.append(
    table(
      ["ID", "問題", "版", "名称"],
      saved.items.map((r) => [r.id, String(r.body.problemId), String(r.body.problemRevision), String(r.body.title)]),
    ),
  );
  root.append(wrap);
}

async function sourcesPanel(root: HTMLElement) {
  const wrap = panel(
    "原典・法規・訂正",
    "出題時点と法令の適用日を別々に保持します。自動収集の結果は変更候補として人が確認します。",
  );
  const kind = select("登録する情報", ["法規の版", "教材の訂正", "出題範囲の対応"]);
  const source = input("公式の参照URL"),
    effective = input("適用日", "", "date"),
    examDate = input("出題日", "", "date"),
    problem = input("対象の問題ID"),
    revision = input("対象の版"),
    text = area("確認した変更・論点の対応"),
    reason = area("根拠と影響"),
    confirmed = check("原典を自分で確認した");
  wrap.append(
    kind.field,
    source.field,
    effective.field,
    examDate.field,
    problem.field,
    revision.field,
    text.field,
    reason.field,
    confirmed.field,
    button("確認した情報を登録", async () => {
      if (!confirmed.input.checked || !text.input.value.trim()) throw new Error("原典と内容の確認が必要です");
      const url = new URL(source.input.value);
      if (url.protocol !== "https:") throw new Error("HTTPSの公式URLを入力してください");
      await saveRecord(
        kind.input.value === "法規の版" ? "law" : kind.input.value === "教材の訂正" ? "correction" : "blueprint",
        crypto.randomUUID(),
        {
          url: url.href,
          effectiveAt: effective.input.value,
          examDate: examDate.input.value,
          problemId: problem.input.value,
          revision: revision.input.value,
          text: text.input.value,
          reason: reason.input.value,
          reviewedBy: identity?.id,
          reviewedAt: Date.now(),
        },
      );
      notice(wrap, "原典との対応を記録しました");
    }),
  );
  const candidates = await records("ingest");
  for (const row of candidates.items.filter((r) => r.body.status === "draft").slice(0, 20)) {
    const card = panel(String(row.body.title));
    const why = area("確認結果", "", 2);
    card.append(
      h("p", {}, String(row.body.url)),
      h("pre", { class: "lab-prose" }, String(row.body.excerpt ?? "")),
      why.field,
      button("確認済み候補にする", async () => {
        if (!why.input.value.trim()) throw new Error("確認結果を入力してください");
        await saveRecord(
          "ingest",
          row.id,
          { ...row.body, status: "reviewed-candidate", review: why.input.value },
          row.revision,
        );
        notice(card, "確認結果を保存しました。問題の公開は問題監修から行ってください。");
      }),
    );
    wrap.append(card);
  }
  wrap.append(link("n8nの公式資料収集ワークフロー", "./service/official-watch.n8n.json"));
  root.append(wrap);
}

async function supportPanel(root: HTMLElement) {
  const wrap = panel(
    "答案・質問の確認待ち",
    "学習者が共有を選んだ質問だけを表示します。採点する場合は保存済みの観点に沿って人が確認します。",
  );
  const rows = await api<{ items: (StoredRecord & { owner: string })[] }>("admin/support");
  const rubrics = (await records("rubric")).items;
  for (const row of rows.items) {
    const card = panel(String(row.body.problemId ?? "質問"));
    const reply = area("回答・次に確認する点", String(row.body.reply ?? ""));
    const rubric = select("採点観点（任意）", ["採点しない", ...rubrics.map((r) => `${r.id} ${r.body.title}`)]),
      scores = area("観点IDごとの得点JSON（採点する場合）", "{}", 2);
    card.append(
      h("pre", { class: "lab-prose" }, String(row.body.question ?? "")),
      h("p", {}, String(row.body.context ?? "")),
      reply.field,
      rubric.field,
      scores.field,
      button("確認結果を保存", async () => {
        await api("admin/support", "POST", {
          owner: row.owner,
          id: row.id,
          expectedRevision: row.revision,
          reply: reply.input.value,
          rubricId: rubric.input.value === "採点しない" ? undefined : rubric.input.value.split(" ")[0],
          scores: JSON.parse(scores.input.value),
        });
        notice(card, "本人が確認できる回答として保存しました");
      }),
    );
    wrap.append(card);
  }
  if (!rows.items.length) notice(wrap, "共有された確認待ちの質問はありません。");
  root.append(wrap);
}

async function operationsPanel(root: HTMLElement) {
  const overview = await api<{
    members: { id: string; role: string; status: string }[];
    usage: { day: string; kind: string; requests: number; input_tokens: number; output_tokens: number }[];
    audit: { action: string; target: string; created_at: number }[];
    calibration: { problemId: string; learners: number; rate: number | null }[];
  }>("admin/overview");
  const wrap = panel("監修量と運用費");
  const minutes = input("1週間の監修時間（分）", "120", "number"),
    per = input("1件の実測監修時間（分）", "30", "number"),
    waiting = input("監修待ちの件数", "0", "number"),
    capacity = h("div", {});
  wrap.append(
    minutes.field,
    per.field,
    waiting.field,
    button("作問の上限を計算・保存", async () => {
      const result = capacityPlan(Number(minutes.input.value), Number(per.input.value), Number(waiting.input.value));
      capacity.replaceChildren();
      notice(
        capacity,
        `今週の確認可能数 ${result.capacity}件 ／ 積み残し ${result.remaining}件。新規作問は確認可能数以内に調整します。`,
      );
      await saveRecord("capacity", crypto.randomUUID(), {
        ...result,
        minutes: Number(minutes.input.value),
        minutesPerReview: Number(per.input.value),
        createdAt: Date.now(),
      });
    }),
    capacity,
  );
  const costInputs = [
    "月間利用者数",
    "入力100万トークンの費用",
    "出力100万トークンの費用",
    "監修時間（分）",
    "時間単価",
    "月間保存費用",
    "質問対応時間（分）",
  ].map((name) => input(name, "0", "number"));
  const cost = h("div", {});
  wrap.append(
    h("h4", {}, "同じ通貨単位で運用費を計算する"),
    ...costInputs.map((c) => c.field),
    button("費用を計算・保存", async () => {
      const n = costInputs.map((c) => Number(c.input.value));
      const result = unitEconomics({
        active: n[0] ?? 0,
        inputTokens: overview.usage.reduce((sum, r) => sum + r.input_tokens, 0),
        outputTokens: overview.usage.reduce((sum, r) => sum + r.output_tokens, 0),
        inputPrice: n[1] ?? 0,
        outputPrice: n[2] ?? 0,
        reviewMinutes: n[3] ?? 0,
        hourlyCost: n[4] ?? 0,
        storageCost: n[5] ?? 0,
        supportMinutes: n[6] ?? 0,
      });
      cost.replaceChildren(
        table(
          ["費用", "金額"],
          [
            ["合計", result.total],
            ["1人あたり", result.perActive],
          ],
        ),
      );
      await saveRecord("cost", crypto.randomUUID(), { ...result, createdAt: Date.now() });
    }),
    cost,
    table(
      ["日", "用途", "リクエスト", "入力トークン", "出力トークン"],
      overview.usage.map((r) => [r.day, r.kind, r.requests, r.input_tokens, r.output_tokens]),
    ),
    button("期限切れ画像を削除", async () => {
      const result = await api<{ deleted: number }>("admin/purge", "POST", {});
      notice(wrap, `${result.deleted}件の期限切れ画像を削除しました`);
    }),
  );
  root.append(wrap);
  const study = panel(
    "少人数で学習経路を確認する",
    "対象者の同意を得て、操作の詰まり・自力回答・定着を記録します。現在、合格確率の表示は無効です。",
  );
  const phase = select("確認する課題", [
      "初回設定",
      "演習から復習",
      "中断と再開",
      "キーボード・拡大",
      "支援を外した回答",
      "日を空けた定着",
    ]),
    observation = area("匿名の実測結果・端末・成功／失敗・所要時間"),
    reason = input("継続したい理由"),
    willingness = input("支払う意思の聞き取り（任意）");
  study.append(
    phase.field,
    observation.field,
    reason.field,
    willingness.field,
    button("検証記録を保存", async () => {
      if (!observation.input.value.trim()) throw new Error("実測結果を入力してください");
      await saveRecord("interview", crypto.randomUUID(), {
        phase: phase.input.value,
        observation: observation.input.value,
        reason: reason.input.value,
        willingness: willingness.input.value,
        createdAt: Date.now(),
      });
      notice(study, "検証記録を保存しました");
    }),
  );
  const signals = demandSignals(
    (await records<{ reason: string; willingness: string }>("interview")).items.map((r) => r.body),
  );
  study.append(
    table(
      ["継続理由", "件数"],
      signals.reasons.map(([reason, count]) => [reason, count]),
    ),
    h("p", {}, signals.note),
    table(
      ["問題", "別々の学習者数", "初回・自力の正答率"],
      overview.calibration.map((r) => [
        r.problemId,
        r.learners,
        r.rate === null ? "30人未満：補正を保留" : `${Math.round(r.rate * 100)}%`,
      ]),
    ),
  );
  root.append(study);
  const access = panel("会員権限と操作履歴");
  if (identity?.role === "owner")
    for (const person of overview.members.filter((m) => m.role !== "owner")) {
      const role = select(`${person.id} の権限`, ["student", "reviewer"], person.role),
        status = select("利用状態", ["active", "suspended"], person.status);
      access.append(
        role.field,
        status.field,
        button("この会員の権限を更新", async () => {
          await api("admin/member", "POST", { id: person.id, role: role.input.value, status: status.input.value });
          notice(access, "権限を更新しました");
        }),
      );
    }
  access.append(
    table(
      ["時刻", "操作", "対象"],
      overview.audit.map((r) => [new Date(r.created_at).toLocaleString("ja-JP"), r.action, r.target]),
    ),
  );
  root.append(access);
}
