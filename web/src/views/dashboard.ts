/**
 * views/dashboard.ts — 進捗タブの描画。
 * renderDashboard をセクション関数へ分解（I-054）:
 * levelCard / todaySection / xpChartSection / masterySection / statsSection / badgesSection
 */
import { evaluateAchievements } from "../achievements.js";
import {
  accuracyTrend,
  allSubjectReadiness,
  bySubject,
  byTopic,
  dailyActivity,
  masteryLevel,
  overall,
  recentAccuracy,
  reviewForecast,
  type SubjectReadiness,
  topicSubjectMap,
} from "../dashboard.js";
import { sameJstDay } from "../dates.js";
import { loadFreezeState } from "../freeze.js";
import { buildStudyPlan } from "../plan.js";
import { getDailyGoal, getExamDate } from "../settings.js";
import { problems, progress, storage } from "../state/app.js";
import { ghostRace, masteredTopics, myStats } from "../stats.js";
import { h } from "../ui/dom.js";
import { showToast } from "../ui/toast.js";
import { bar, emptyState, masteryChip, ringNode, sparklineNode } from "../ui/widgets.js";
import { type levelInfo, xpByDay, xpBySubject } from "../xp.js";
import { currentLevel, freezeInfo, questsCard, weeklyQuestsCard } from "./practice.js";
import { switchView } from "./router.js";

/** レベルカード（XP・称号・次レベルへの進捗）— 成長の実感を最上段に。 */
function levelCard(root: HTMLElement, lv: ReturnType<typeof levelInfo>): void {
  root.append(
    h(
      "div",
      { class: "card lvlcard" },
      h(
        "div",
        { class: "lvlrow" },
        h("span", { class: "lvlbadge" }, `Lv.${lv.level}`),
        h(
          "div",
          {},
          h("div", { class: "lvltitle" }, lv.title),
          h(
            "div",
            { class: "muted small" },
            `次のレベルまで ${lv.xpNeed - lv.xpInto} XP ・ 累計 ${lv.totalXp.toLocaleString("ja-JP")} XP` +
              (lv.nextTitle ? ` ・ Lv.${lv.nextTitle.level}で「${lv.nextTitle.title}」` : ""),
          ),
        ),
      ),
      bar(Math.round(lv.progress * 100), "次のレベルへの進捗"),
    ),
  );
}

/** 今日の学習進捗と試験カウントダウンのカード群。 */
function todaySection(
  root: HTMLElement,
  logs: ReturnType<typeof progress.logs>,
  plan: ReturnType<typeof buildStudyPlan>,
  o: ReturnType<typeof overall>,
): void {
  root.append(
    h(
      "div",
      { class: "grid2" },
      h(
        "div",
        { class: "card" },
        h("div", { class: "muted" }, "試験まで"),
        h("div", { class: "big" }, `${plan.daysLeft}日`),
      ),
      h(
        "div",
        { class: "card" },
        h("div", { class: "muted" }, "総合正答率"),
        h("div", { class: "big" }, `${Math.round(o.accuracy * 100)}%`),
      ),
    ),
    h(
      "div",
      { class: "grid2" },
      h(
        "div",
        { class: "card today" },
        ringNode(plan.todayCount, plan.dailyGoal),
        h(
          "div",
          {},
          h("div", { class: "muted" }, "今日の学習"),
          h("div", {}, `${plan.todayCount} / ${plan.dailyGoal} 問 ${plan.metToday ? "✅" : ""}`),
        ),
      ),
      h(
        "div",
        { class: "card" },
        h("div", { class: "muted" }, "推奨ペース"),
        h("div", {}, `1日 ${plan.recommendedPerDay} 問（2巡）`),
      ),
    ),
    h(
      "p",
      { class: "muted" },
      `総解答 ${o.attempts} 問 ・ 学習論点 ${o.topicsStudied} ・ 直近20問 ${Math.round(recentAccuracy(logs) * 100)}%`,
    ),
    questsCard(),
    weeklyQuestsCard(),
  );
}

/** 週間XPチャートとスパークラインのセクション。 */
function xpChartSection(root: HTMLElement, logs: ReturnType<typeof progress.logs>): void {
  // 週間XPチャート（「昨日の自分」との比較は他人比較より健全な競争心を生む）。
  const weekly = xpByDay(logs, 7, Date.now());
  if (weekly.some((v) => v > 0)) {
    const max = Math.max(1, ...weekly);
    const fmt = new Intl.DateTimeFormat("ja-JP", { weekday: "narrow", timeZone: "Asia/Tokyo" });
    const chart = h("div", { class: "xpweek" });
    weekly.forEach((v, i) => {
      const dayLabel = i === 6 ? "今日" : fmt.format(new Date(Date.now() - (6 - i) * 86_400_000));
      chart.append(
        h(
          "div",
          { class: "xpcol" },
          h("div", { class: "xpval" }, v > 0 ? String(v) : ""),
          h("div", { class: "xpbar", style: `height:${Math.max(4, Math.round((v / max) * 64))}px` }),
          h("div", { class: "xplabel" }, dayLabel),
        ),
      );
    });
    root.append(h("h2", {}, "今週の獲得XP"), chart);
  }

  const spark = sparklineNode(accuracyTrend(logs));
  if (spark) root.append(h("h2", {}, "正答率の推移"), spark);
}

/** 科目別到達度・XPのセクション。 */
function masterySection(root: HTMLElement, logs: ReturnType<typeof progress.logs>): void {
  root.append(h("h2", {}, "科目別 到達度"));
  const subjectXp = xpBySubject(logs, topicSubjectMap(problems));
  const maxSubjectXp = Math.max(1, ...subjectXp.values());
  for (const r of bySubject(logs, problems)) {
    const level = masteryLevel(r);
    root.append(
      h("div", { class: "row" }, h("span", {}, r.subject), bar(Math.round(r.accuracy * 100)), masteryChip(level)),
    );
  }

  // 科目別XP（学習量バランスの可視化。到達度=質、XP=量の両輪で偏りに気づける）。
  root.append(h("h2", {}, "科目別 獲得XP"));
  for (const [subject, xp] of [...subjectXp.entries()].sort((a, b) => b[1] - a[1])) {
    root.append(
      h(
        "div",
        { class: "row" },
        h("span", {}, subject),
        bar(Math.round((xp / maxSubjectXp) * 100)),
        h("span", {}, `${xp.toLocaleString("ja-JP")}`),
      ),
    );
  }
}

/** 科目別 合格見込み（推定）のセクション（#52）。正答率＋カバレッジ＋残り日数で判定。 */
function readinessSection(root: HTMLElement, logs: ReturnType<typeof progress.logs>, daysLeft: number): void {
  const rows = allSubjectReadiness(logs, problems, daysLeft);
  // 全科目とも未着手なら出さない（空のセクションを避ける）。
  if (rows.every((r) => r.attempts === 0)) return;
  const verdictStyle = (v: SubjectReadiness["verdict"]): string =>
    v === "順調" ? "color:var(--ok)" : v === "もう少し" ? "color:var(--accent)" : "color:var(--ng)";
  const verdictIcon = (v: SubjectReadiness["verdict"]): string =>
    v === "順調" ? "🟢" : v === "もう少し" ? "🟡" : "🔴";
  root.append(
    h("h2", {}, "科目別 合格見込み（推定）"),
    h(
      "p",
      { class: "muted small" },
      "直近の正答率・論点カバレッジ・残り日数からの推定です（合否を保証するものではありません）。",
    ),
  );
  for (const r of rows) {
    root.append(
      h(
        "div",
        { class: "row" },
        h("span", {}, r.subject),
        bar(Math.round(r.readiness * 100)),
        h(
          "span",
          { style: verdictStyle(r.verdict) },
          `${verdictIcon(r.verdict)} ${r.verdict} ${Math.round(r.readiness * 100)}%`,
        ),
      ),
    );
  }
}

/** 自分の記録・ゴーストレース・弱点論点・マスター済み論点のセクション。 */
function statsSection(
  root: HTMLElement,
  logs: ReturnType<typeof progress.logs>,
  lv: ReturnType<typeof levelInfo>,
): void {
  // 自分の記録（他人とのランキングではなく自己ベスト＝オフラインで成立する健全な競争）。
  const fzStat = loadFreezeState(storage);
  const st = myStats(logs, fzStat.usedDays, fzStat.restDays);
  const xpPerDay = st.studyDays > 0 ? Math.round(lv.totalXp / st.studyDays) : 0;
  const o = overall(logs);
  root.append(
    h("h2", {}, "自分の記録"),
    // これまでのあゆみ（累計の一行サマリー。続けてきた事実そのものを称える）。
    h(
      "p",
      { class: "muted" },
      `📖 これまでに ${o.attempts.toLocaleString("ja-JP")} 問・${lv.totalXp.toLocaleString("ja-JP")} XP・` +
        `${st.studyDays} 日間 学習してきました`,
    ),
    h(
      "div",
      { class: "mystats" },
      ...(
        [
          [String(st.studyDays), "学習日数"],
          [`${st.bestStreakEver}日`, "歴代最長🔥"],
          [String(xpPerDay), "XP/学習日"],
          [String(st.bestCombo), "最高コンボ"],
          [String(st.bestDayCount), "1日最多解答"],
          [String(st.questClearDays), "クエスト全達成日"],
          [String(st.perfectDays), "パーフェクトデー"],
          [String(st.freezeSaves), "お守りの救援"],
          [String(masteredTopics(logs).length), "マスター論点"],
        ] as const
      ).map(([num, label]) =>
        h("div", { class: "stat" }, h("div", { class: "sn" }, num), h("div", { class: "sl" }, label)),
      ),
    ),
  );

  // ゴーストレース: 「過去7日の自分」と今日のXPで競う（オフラインで成立する健全な競争）。
  const race = ghostRace(xpByDay(logs, 8, Date.now()));
  if (race.today > 0 || race.avg > 0) {
    root.append(
      h(
        "div",
        { class: "card race" },
        h(
          "span",
          {},
          race.beat
            ? "🏁 今日は「過去7日の自分」を超えています！"
            : `🏃 7日平均の自分まで あと ${Math.max(1, race.avg - race.today + 1)} XP`,
        ),
        h("span", { class: "muted small" }, `今日 ${race.today} XP ／ 7日平均 ${race.avg} XP`),
      ),
    );
  }

  const weak = byTopic(logs)
    .filter((t) => t.attempts > 0)
    .slice(0, 5);
  if (weak.length > 0) {
    root.append(h("h2", {}, "弱点 論点 TOP5"));
    for (const t of weak) {
      root.append(
        h(
          "div",
          { class: "row" },
          h("span", { style: "white-space:nowrap;overflow:hidden;text-overflow:ellipsis" }, t.topic),
          bar(Math.round(t.accuracy * 100)),
          h("span", {}, `${Math.round(t.accuracy * 100)}%`),
        ),
      );
    }
  }

  // マスター済み論点（「余裕」評価×3。弱点の隣に「できるようになったこと」も見せる）。
  const mastered = masteredTopics(logs);
  if (mastered.length > 0) {
    const chips = h("div", { class: "mchips" });
    for (const t of mastered.slice(0, 12)) chips.append(h("span", { class: "mchip" }, `🎓 ${t}`));
    if (mastered.length > 12) chips.append(h("span", { class: "mchip more" }, `ほか ${mastered.length - 12} 論点`));
    root.append(h("h2", {}, `マスター済み論点（${mastered.length}）`), chips);
  }

  const fc = reviewForecast(progress.allCardViews().values(), Date.now(), 7);
  root.append(
    h("h2", {}, "今後7日の復習見込み"),
    h(
      "div",
      { class: "toolbar" },
      ...fc.map((n, i) =>
        h(
          "div",
          { class: "card", style: "flex:1;text-align:center;min-width:2.4rem" },
          h("div", { class: "muted" }, i === 0 ? "今日" : `+${i}`),
          h("div", {}, String(n)),
        ),
      ),
    ),
  );

  // 学習ヒートマップ（直近14日の解答数。GitHub風の強度セル）
  const activity = dailyActivity(logs, 14, Date.now());
  const maxCount = Math.max(1, ...activity.map((a) => a.count));
  root.append(
    h("h2", {}, "学習ヒートマップ（直近14日）"),
    h(
      "div",
      { class: "heat" },
      ...activity.map((a) => {
        const lv = a.count === 0 ? 0 : Math.min(4, 1 + Math.floor((a.count / maxCount) * 3.99));
        return h("div", {
          class: `cell lv${lv}`,
          title: `${a.offset === 0 ? "今日" : `${a.offset}日前`}: ${a.count}問`,
        });
      }),
    ),
    h("p", { class: "muted" }, "毎日少しずつが最強。分散学習が忘却に勝ちます。"),
  );
}

/** 実績バッジのセクション。 */
function badgesSection(
  root: HTMLElement,
  logs: ReturnType<typeof progress.logs>,
  lv: ReturnType<typeof levelInfo>,
): void {
  // 実績バッジ（節目の大きな報酬。ロック中も見せて「次の目標」を提示する）。
  const fiBadge = freezeInfo();
  const badges = evaluateAchievements({
    logs,
    streakDays: fiBadge.streak,
    level: lv.level,
    subjectOf: topicSubjectMap(problems),
    usedFreezeDays: fiBadge.state.usedDays,
  });
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const grid = h("div", { class: "badges" });
  for (const b of badges) {
    const node = h(
      b.unlocked ? "button" : "div",
      {
        class: b.unlocked ? "badge on" : "badge off",
        title: b.unlocked ? `${b.desc}（タップでシェア）` : b.desc,
        ...(b.unlocked ? { type: "button", onclick: () => shareBadge(b.title, b.icon, b.desc) } : {}),
      },
      h("span", { class: "bi", "aria-hidden": "true" }, b.unlocked ? b.icon : "🔒"),
      h("span", { class: "bt" }, b.title),
      h("span", { class: "bd" }, b.desc),
    );
    grid.append(node);
  }
  root.append(h("h2", {}, `実績バッジ（${unlockedCount}/${badges.length}・タップでシェア）`), grid);
}

/** 実績のシェア（Web Share API、無ければクリップボード）。学習の誇りを外へ＝自然な口コミ。 */
function shareBadge(title: string, icon: string, desc: string): void {
  const text = `🏅 電験学習アプリ DENKEN-OS で実績「${icon}${title}」を解除！（${desc}） #電験 #デンタマ`;
  try {
    if (typeof navigator.share === "function") {
      void navigator.share({ text }).catch(() => {});
      return;
    }
    void navigator.clipboard?.writeText(text).then(() => showToast("📋 シェア文をコピーしました", "OK", () => {}));
  } catch {
    // シェア不能でも学習は続行。
  }
}

export function renderDashboard(root: HTMLElement): void {
  const logs = progress.logs();
  if (logs.length === 0) {
    root.append(
      emptyState(
        "📊",
        "まだ学習記録がありません",
        "学習タブで問題を解くと、ここに到達度や正答率の推移が表示されます。",
      ),
      h("button", { class: "primary", type: "button", onclick: () => switchView("practice") }, "学習を始める →"),
    );
    return;
  }
  const o = overall(logs);
  const plan = buildStudyPlan({
    examDateIso: getExamDate(storage),
    totalProblems: problems.length,
    todayCount: progress.logs().filter((l) => sameJstDay(l.atMs, Date.now())).length,
    dailyGoal: getDailyGoal(storage),
  });

  const lv = currentLevel();

  levelCard(root, lv);
  todaySection(root, logs, plan, o);
  xpChartSection(root, logs);
  masterySection(root, logs);
  readinessSection(root, logs, plan.daysLeft);
  statsSection(root, logs, lv);
  badgesSection(root, logs, lv);
}
