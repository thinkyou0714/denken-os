import { learningMetrics } from "../../../lib/service/assessment.js";
import { retentionChecks, skillSummary } from "../../../lib/service/study-tools.js";
import { getExamDate, setExamDate } from "../settings.js";
import { progress, storage } from "../state/app.js";
import { allAttempts, records, saveRecord } from "./client.js";
import { cloudStorage } from "./cloud-storage.js";
import { disclosure } from "./study-ui.js";
import { button, h, input, link, notice, panel, percent, select, table } from "./ui.js";

export async function renderStudySettings(root: HTMLElement) {
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
  root.append(
    settings,
    disclosure(
      "以前の画面・詳細設定",
      h("p", {}, "旧学習画面、テーマ、その他の設定を開けます。"),
      h("a", { href: "#settings" }, "詳細設定を開く"),
      h("a", { href: "#practice" }, "以前の学習画面を開く"),
    ),
  );
}

export async function renderProgress(root: HTMLElement) {
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
  const recentMinutes = attempts
    .filter((a) => a.mode !== "validation" && a.finishedAt >= Date.now() - 7 * 86400000)
    .reduce((n, a) => n + (a.finishedAt - a.startedAt) / 60000, 0);
  const profile = (await records<{ weeklyMinutes?: string }>("profile")).items.find((r) => r.id === "profile");
  const targetMinutes = Number(profile?.body.weeklyMinutes) || 0;
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
