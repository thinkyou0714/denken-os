/**
 * freeze.ts — ストリークお守り（Duolingo の Streak Freeze 相当・純ロジック）。
 *
 * 継続研究の核心: ストリークは強力な動機だが「1日の欠席で全消滅」だと、
 * 途切れた瞬間にアプリごと離脱する（損失回避の裏目）。お守りは欠席日を
 * 自動で肩代わりし、長期ストリークを守る安全網になる。
 *  - 7日継続するごとに1個獲得（最大2個保持）。「継続が継続を守る」好循環。
 *  - 欠席が見つかったら次回起動時に自動消費（手動操作を要求しない）。
 *  - 消費した日は denken:freeze に記録し、ストリーク計算で学習日と同様に扱う。
 * DOM 非依存でテスト可能。日境界は store.ts と同じ JST(UTC+9)。
 */
import { dayIndexOf, JST_OFFSET_MS } from "./quests.js";
import type { StorageLike, WebAnswerLog } from "./store.js";

export const FREEZE_KEY = "denken:freeze";
/**
 * II-154: runFreezeBridge の最終実行日を記録するキー。
 * 同一日に複数回呼ばれても二重カウントしないための冪等化用。
 */
export const FREEZE_BRIDGE_DATE_KEY = "denken:freezeBridgeDate";
/** 保持できるお守りの上限（Duolingo と同じ2個。貯めすぎると緊張感が消える）。 */
export const FREEZE_CAP = 2;
/** お守りの獲得周期（ストリークが7の倍数に到達するたびに1個）。 */
export const FREEZE_AWARD_EVERY = 7;

export interface FreezeState {
  /** 手持ちのお守り数（0..FREEZE_CAP）。 */
  count: number;
  /** お守りで肩代わりした日（JST 日番号）。ストリーク計算で学習日と同様に扱う。 */
  usedDays: number[];
  /** 最後に獲得判定した時点のストリーク（同じ節目での二重獲得を防ぐ）。 */
  lastAwardStreak: number;
  /** おやすみ予約した日（JST 日番号）。休む勇気をストリークの罰にしない（健全性）。 */
  restDays: number[];
}

const EMPTY: FreezeState = { count: 0, usedDays: [], lastAwardStreak: 0, restDays: [] };

function emptyState(): FreezeState {
  return { ...EMPTY, usedDays: [], restDays: [] };
}

/** 保存値を安全に読み出す（壊れた JSON・型不一致は初期状態へフォールバック。restDays は後方互換で省略可）。 */
export function loadFreezeState(storage: StorageLike): FreezeState {
  const raw = storage.getItem(FREEZE_KEY);
  if (!raw) return emptyState();
  try {
    const p = JSON.parse(raw) as Partial<FreezeState>;
    const count =
      typeof p.count === "number" && Number.isFinite(p.count)
        ? Math.max(0, Math.min(FREEZE_CAP, Math.floor(p.count)))
        : 0;
    const usedDays = Array.isArray(p.usedDays) ? p.usedDays.filter((d): d is number => typeof d === "number") : [];
    const lastAwardStreak =
      typeof p.lastAwardStreak === "number" && Number.isFinite(p.lastAwardStreak) ? Math.max(0, p.lastAwardStreak) : 0;
    const restDays = Array.isArray(p.restDays) ? p.restDays.filter((d): d is number => typeof d === "number") : [];
    return { count, usedDays, lastAwardStreak, restDays };
  } catch {
    console.warn(`[freeze] JSON.parse 失敗: key=${FREEZE_KEY}`);
    return emptyState();
  }
}

export function saveFreezeState(storage: StorageLike, state: FreezeState): void {
  try {
    storage.setItem(FREEZE_KEY, JSON.stringify(state));
  } catch {
    // 保存不能（プライベートモード等）でも学習は継続させる。
  }
}

/** 解答ログから学習した日（JST 日番号）の集合を作る。 */
export function studiedDays(logs: readonly WebAnswerLog[], dayOffsetMs: number = JST_OFFSET_MS): Set<number> {
  return new Set(logs.map((l) => dayIndexOf(l.atMs, dayOffsetMs)));
}

/** 学習日＋お守り消費日を合算したストリーク（今日 or 昨日を起点に遡る）。 */
export function streakWithFreezes(days: ReadonlySet<number>, usedDays: readonly number[], todayIdx: number): number {
  const all = new Set(days);
  for (const d of usedDays) all.add(d);
  let cursor = all.has(todayIdx) ? todayIdx : todayIdx - 1;
  if (!all.has(cursor)) return 0;
  let streak = 0;
  while (all.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

export interface StreakBreakdown {
  /** 実効ストリーク日数（学習＋肩代わり）。 */
  total: number;
  /** うち実際に学習した日数。 */
  studiedDays: number;
  /** うちお守り・おやすみで肩代わりした日数。 */
  coveredDays: number;
}

/**
 * 現在のストリークの内訳（#62）。学習した日と、お守り/おやすみで肩代わりした日を区別する。
 * 「連続◯日（うち学習◯日・お守り◯日）」のように UI で透明に見せるための純関数。
 */
export function streakBreakdown(
  studied: ReadonlySet<number>,
  covered: readonly number[],
  todayIdx: number,
): StreakBreakdown {
  const coveredSet = new Set(covered);
  const all = new Set(studied);
  for (const d of coveredSet) all.add(d);
  let cursor = all.has(todayIdx) ? todayIdx : todayIdx - 1;
  if (!all.has(cursor)) return { total: 0, studiedDays: 0, coveredDays: 0 };
  let studiedDays = 0;
  let coveredDays = 0;
  while (all.has(cursor)) {
    // 学習日として記録があれば「学習」、無ければ「肩代わり」に数える（学習を優先）。
    if (studied.has(cursor)) studiedDays += 1;
    else coveredDays += 1;
    cursor -= 1;
  }
  return { total: studiedDays + coveredDays, studiedDays, coveredDays };
}

export interface BridgeResult {
  state: FreezeState;
  /** 今回お守りで肩代わりした日（昇順）。空なら消費なし。 */
  bridgedDays: number[];
}

/**
 * 欠席日の自動肩代わり（起動時に1回呼ぶ）。
 * 直近の学習/肩代わり日と今日の間の欠席日数が手持ち以内なら、その全日を消費して
 * ストリークを繋ぐ。手持ちで足りない場合は何もしない（ストリークは途切れるが
 * お守りは温存され、再出発後の保険になる）。
 */
export function bridgeWithFreezes(state: FreezeState, days: ReadonlySet<number>, todayIdx: number): BridgeResult {
  const all = new Set(days);
  for (const d of state.usedDays) all.add(d);
  for (const d of state.restDays) all.add(d); // おやすみ予約日は欠席ではない（お守りを消費しない）
  if (all.size === 0) return { state, bridgedDays: [] };
  // 今日より前で最後に「継続していた」日を探す。
  let last = Number.NEGATIVE_INFINITY;
  for (const d of all) {
    if (d < todayIdx && d > last) last = d;
  }
  if (!Number.isFinite(last)) return { state, bridgedDays: [] };
  const missed: number[] = [];
  for (let d = last + 1; d < todayIdx; d++) missed.push(d);
  if (missed.length === 0 || missed.length > state.count) return { state, bridgedDays: [] };
  return {
    state: {
      count: state.count - missed.length,
      usedDays: [...state.usedDays, ...missed],
      lastAwardStreak: state.lastAwardStreak,
      restDays: state.restDays,
    },
    bridgedDays: missed,
  };
}

export interface AwardResult {
  state: FreezeState;
  awarded: boolean;
}

/**
 * ストリーク節目（7日ごと）でお守りを1個付与する（上限あり）。
 *  - 「最後に通過した節目」基準なので、機能導入前から長く継続しているユーザーも
 *    次の解答で1個受け取れる（節目ちょうどの日を逃しても取りこぼさない）。
 *  - 上限で受け取れなかった節目は lastAwardStreak を進めない＝枠が空き次第、
 *    次の機会に受け取れる。
 *  - ストリークが途切れて作り直した場合（現在の streak < 記録済み節目）、過去の節目は
 *    現在のストリークと無関係なので無視する＝新しいストリークでも7日で再び獲得できる。
 */
export function maybeAwardFreeze(state: FreezeState, streak: number): AwardResult {
  const passedMilestone = Math.floor(Math.max(0, streak) / FREEZE_AWARD_EVERY) * FREEZE_AWARD_EVERY;
  const effectiveLast = state.lastAwardStreak > streak ? 0 : state.lastAwardStreak;
  if (passedMilestone <= 0 || passedMilestone <= effectiveLast || state.count >= FREEZE_CAP) {
    return { state, awarded: false };
  }
  return {
    state: {
      count: state.count + 1,
      usedDays: state.usedDays,
      lastAwardStreak: passedMilestone,
      restDays: state.restDays,
    },
    awarded: true,
  };
}

// ---- おやすみ予約（休む勇気をストリークの罰にしない） ----

/**
 * 明日をおやすみ予約できるか。条件は「今日すでに学習済み」。
 * これにより休みを連鎖できず（休んだ翌日は学習しないと次を予約できない）、
 * 最大でも学習日と休息日の交互にしかならない＝乱用を構造的に防ぐ。
 */
export function canReserveRest(state: FreezeState, studied: ReadonlySet<number>, todayIdx: number): boolean {
  return studied.has(todayIdx) && !state.restDays.includes(todayIdx + 1);
}

/** 明日のおやすみ予約をトグルする（予約済みなら取消）。 */
export function toggleRestReservation(state: FreezeState, todayIdx: number): FreezeState {
  const tomorrow = todayIdx + 1;
  const restDays = state.restDays.includes(tomorrow)
    ? state.restDays.filter((d) => d !== tomorrow)
    : [...state.restDays, tomorrow];
  return { ...state, restDays };
}

/** ストリーク計算で「学習日扱い」にする日（お守り消費日＋おやすみ予約日）。 */
export function coveredDays(state: FreezeState): number[] {
  return [...state.usedDays, ...state.restDays];
}

// ---- II-154: runFreezeBridge 冪等化ヘルパー ----

/**
 * 今日の JST 日番号文字列を返す（FREEZE_BRIDGE_DATE_KEY の保存値と比較する）。
 * @internal freeze.ts 内の冪等化判定に使う。
 */
function todayDateString(todayIdx: number): string {
  return String(todayIdx);
}

/**
 * runFreezeBridge を今日すでに実行済みか確認する（冪等化チェック）。
 * 実行済みなら true を返す。views 層の runFreezeBridge はこれを呼んで早期リターンできる。
 */
export function isFreezeBridgeRunToday(storage: StorageLike, todayIdx: number): boolean {
  return storage.getItem(FREEZE_BRIDGE_DATE_KEY) === todayDateString(todayIdx);
}

/**
 * runFreezeBridge の実行日を記録する（冪等化マーク）。
 * views 層の runFreezeBridge はブリッジ処理後にこれを呼んで実行日を保存する。
 */
export function markFreezeBridgeRun(storage: StorageLike, todayIdx: number): void {
  try {
    storage.setItem(FREEZE_BRIDGE_DATE_KEY, todayDateString(todayIdx));
  } catch {
    // 保存不能でも学習は継続させる。
  }
}
