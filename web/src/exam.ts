/**
 * exam.ts — 模試（時間制限・本番再現）の出題セット構築と採点（純ロジック）。
 * 本番の緊張感・時間配分・合格ライン(60%)を体験させ、弱点を炙り出す。
 *
 * 本番再現の是正（#38/#47/#48/#12/#13/#59/#61）:
 *  - 時間制限は「1問N分」の発明値ではなく、本番の **科目別 総試験時間** を再現する
 *    （理論/電力/機械=90分、法規=65分、電力管理=120分、機械制御=60分）。
 *  - 一次は4科目すべてが揃い、かつ各科目60%以上で初めて「合格判定」。4科目揃わない
 *    出題は「部分模試」として合否判定しない。
 *  - 二次は電力管理(120点満点)＋機械制御(60点満点)の **合算** で 108/180(60%) を判定する
 *    （科目別ではない）。
 */
import type { Problem, Subject } from "../../lib/engine/schema.js";

export interface ExamOptions {
  count: number;
  /** 対象科目（未指定なら全科目）。 */
  subjects?: Subject[];
  rng?: () => number;
}

export interface ExamScore {
  total: number;
  correct: number;
  scorePct: number; // 0..100（整数）
  passed: boolean; // 合格ライン60%以上
}

/** 合格ライン（電験は各科目おおむね60%）。 */
export const PASS_THRESHOLD = 60;

/** 一次の科目（この4科目すべてが揃って初めて一次合格判定ができる）。 */
export const PRIMARY_SUBJECTS: readonly Subject[] = ["理論", "電力", "機械", "法規"];
/** 二次の科目。 */
export const SECONDARY_SUBJECTS: readonly Subject[] = ["電力管理", "機械制御"];

/**
 * 本番の科目別 総試験時間（分）。電験二種の実際の試験時間を再現する。
 *  - 一次: 理論/電力/機械 = 90分、法規 = 65分
 *  - 二次: 電力・管理 = 120分、機械・制御 = 60分
 */
export const SUBJECT_EXAM_MINUTES: Readonly<Record<Subject, number>> = {
  理論: 90,
  電力: 90,
  機械: 90,
  法規: 65,
  電力管理: 120,
  機械制御: 60,
};

/**
 * 二次の科目別 満点。合否は両科目の合算（108/180=60%）で判定する（科目別ではない）。
 *  - 電力・管理: 120点満点（記述）
 *  - 機械・制御: 60点満点（記述。4問中2問選択）
 */
export const SECONDARY_MAX_POINTS: Readonly<Record<string, number>> = {
  電力管理: 120,
  機械制御: 60,
};
/** 二次合計の満点（180点）。 */
export const SECONDARY_TOTAL_MAX = 180;
/** 二次の合格ライン（合計の60%＝108点）。 */
export const SECONDARY_PASS_POINTS = Math.round(SECONDARY_TOTAL_MAX * 0.6);

/**
 * 科目あたりの「本番1回ぶん」の問題数の目安。部分模試（少問数）のとき時間を比例配分するための
 * 基準値。実際の出題数は年度で揺れるため、時間配分の体感が破綻しない概算に留める。
 */
export const FULL_SUBJECT_QUESTION_COUNT: Readonly<Record<Subject, number>> = {
  理論: 18,
  電力: 15,
  機械: 15,
  法規: 13,
  電力管理: 6,
  機械制御: 4,
};

/** 旧API互換: 形式別の概算持ち時間（部分模試の比例配分・他モジュールの参照用に残す）。 */
export const PRIMARY_PER_PROBLEM_MS = 3 * 60_000;
export const DESCRIPTIVE_PER_PROBLEM_MS = 10 * 60_000;
/** 模試全体の上限（だらだら防止）。二次2科目フル(180分)まで許容する。 */
export const EXAM_TIME_CAP_MS = 180 * 60_000;

/**
 * 出題セットから模試の制限時間を算出する（本番の科目別 総試験時間を再現）。
 *
 * 科目ごとに本番の総試験時間を割り当てる。ただし出題数がその科目の「本番1回ぶん」より
 * 少ない部分模試では、本番時間を比例配分する（`min(本番時間, 本番時間 × 出題数/基準数)`）。
 * 単一科目フル相当ならその科目の本番時間そのもの、複数科目なら合算（上限つき）。
 */
export function examTimeLimitMs(set: Problem[]): number {
  if (set.length === 0) return 0;
  const countBySubject = new Map<Subject, number>();
  for (const p of set) countBySubject.set(p.subject, (countBySubject.get(p.subject) ?? 0) + 1);
  let totalMin = 0;
  for (const [subject, count] of countBySubject) {
    const fullMin = SUBJECT_EXAM_MINUTES[subject] ?? 90;
    const refCount = FULL_SUBJECT_QUESTION_COUNT[subject] ?? 15;
    // 出題数が基準数以上なら本番フル、未満なら比例配分（部分模試）。
    const ratio = Math.min(1, count / Math.max(1, refCount));
    totalMin += fullMin * ratio;
  }
  return Math.min(EXAM_TIME_CAP_MS, Math.round(totalMin) * 60_000);
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    // 0 <= j <= i < length なので両添字とも常に在中（cast は型上の明示のみ）。
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

/**
 * 科目内の出題を「論点(topic)の重複を避けつつ」サンプリングする。
 * 同じ論点が複数並ぶのを防ぎ、出題範囲を広く取る（#59）。論点が尽きたら重複を許す。
 */
function sampleSpread(pool: Problem[], take: number, rng: () => number): Problem[] {
  if (take <= 0 || pool.length === 0) return [];
  const shuffled = shuffle(pool, rng);
  const seenTopics = new Set<string>();
  const primary: Problem[] = []; // 論点が未出のもの（優先）
  const leftover: Problem[] = []; // 論点が既出のもの（不足時の補充）
  for (const p of shuffled) {
    if (!seenTopics.has(p.topic)) {
      seenTopics.add(p.topic);
      primary.push(p);
    } else {
      leftover.push(p);
    }
  }
  return [...primary, ...leftover].slice(0, take);
}

/**
 * 模試の出題セットを構築する。対象科目から可能な限り均等に選び、count 件に収める。
 * 各科目内では論点の重複を避けてサンプリングする（#59）。
 */
export function buildMockExam(problems: Problem[], opts: ExamOptions): Problem[] {
  const rng = opts.rng ?? Math.random;
  const subjects = opts.subjects;
  const pool = subjects?.length ? problems.filter((p) => subjects.includes(p.subject)) : [...problems];
  if (pool.length === 0) return [];

  // 科目ごとに分け、各科目内で論点の重複を避けて並べる（#59）。
  const groups = new Map<Subject, Problem[]>();
  for (const p of pool) {
    const g = groups.get(p.subject) ?? [];
    g.push(p);
    groups.set(p.subject, g);
  }
  // 各科目を topic 重複回避でシャッフル済みキューにする。
  const queues = [...groups.values()].map((g) => sampleSpread(g, g.length, rng));
  // 全体でも topic 重複を避けるためのセット（科目をまたいだ重複も抑える）。
  const out: Problem[] = [];
  const usedTopics = new Set<string>();
  // ラウンドロビンで均等に取り出す（偏り防止）。論点重複は可能な限り後回しにする。
  let added = true;
  while (out.length < opts.count && added) {
    added = false;
    for (const q of queues) {
      if (out.length >= opts.count) break;
      // この科目から「未出の論点」を優先して1件取り出す。
      let idx = q.findIndex((p) => !usedTopics.has(p.topic));
      if (idx < 0) idx = q.length > 0 ? 0 : -1; // 未出が無ければ先頭（論点尽き）
      if (idx >= 0) {
        const next = q.splice(idx, 1)[0] as Problem;
        out.push(next);
        usedTopics.add(next.topic);
        added = true;
      }
    }
  }
  return out;
}

/**
 * 一次フル模試の出題セットを構築する（#48）。
 * 4科目すべてを最低 minPerSubject 件含み、合計 count 件に収める。
 * これにより「4科目揃った合格判定」が可能になる。問題が足りない科目はある分だけ含める。
 */
export function buildPrimaryFullMock(
  problems: Problem[],
  count: number,
  rng: () => number = Math.random,
  minPerSubject = 1,
): Problem[] {
  const out: Problem[] = [];
  const usedTopics = new Set<string>();
  // まず各科目から最低件数を確保する（4科目を必ず代表させる）。
  for (const subject of PRIMARY_SUBJECTS) {
    const pool = problems.filter((p) => p.subject === subject);
    const picked = sampleSpread(pool, Math.min(minPerSubject, pool.length), rng);
    for (const p of picked) {
      out.push(p);
      usedTopics.add(p.topic);
    }
  }
  // 残り枠を4科目からラウンドロビンで埋める（重複問題は避ける）。
  const remaining = count - out.length;
  if (remaining > 0) {
    const usedIds = new Set(out.map((p) => p.id));
    const rest = problems.filter((p) => PRIMARY_SUBJECTS.includes(p.subject) && !usedIds.has(p.id));
    const fill = buildMockExam(rest, { count: remaining, subjects: [...PRIMARY_SUBJECTS], rng });
    out.push(...fill);
  }
  // 最低件数確保で count を超える場合に備えて切り詰める。
  return out.slice(0, count);
}

/** 解答の正誤配列から採点する。 */
export function scoreExam(results: boolean[]): ExamScore {
  const total = results.length;
  const correct = results.filter(Boolean).length;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { total, correct, scorePct, passed: scorePct >= PASS_THRESHOLD };
}

export interface SubjectScore extends ExamScore {
  subject: Subject;
}

/**
 * 科目別に採点する。電験一次は科目ごとに合否（各60%）が判定されるため、
 * 出題と同じ並びの results を科目で束ねて各科目のスコアを返す。
 */
export function scoreExamBySubject(set: Problem[], results: boolean[]): SubjectScore[] {
  const bySub = new Map<Subject, boolean[]>();
  set.forEach((p, i) => {
    const arr = bySub.get(p.subject) ?? [];
    arr.push(results[i] ?? false);
    bySub.set(p.subject, arr);
  });
  return [...bySub.entries()].map(([subject, rs]) => ({ subject, ...scoreExam(rs) }));
}

/**
 * 一次本番の合格判定（#48）: 4科目すべてが出題され、かつ各科目60%以上であること。
 * 4科目揃っていない出題は「部分模試」であり合格判定はできない（false を返す）。
 */
export function isPrimaryPass(subjectScores: SubjectScore[]): boolean {
  const present = new Set(subjectScores.map((s) => s.subject));
  const allFour = PRIMARY_SUBJECTS.every((s) => present.has(s));
  return allFour && subjectScores.every((s) => s.passed);
}

export type PrimaryVerdict = "pass" | "fail" | "partial";

/**
 * 一次の判定結果（#48）。
 *  - "partial": 4科目が揃っていない（部分模試。合否判定しない）。
 *  - "pass":    4科目すべて60%以上。
 *  - "fail":    4科目は揃ったが足切り科目あり。
 */
export function primaryVerdict(subjectScores: SubjectScore[]): PrimaryVerdict {
  const present = new Set(subjectScores.map((s) => s.subject));
  const allFour = PRIMARY_SUBJECTS.every((s) => present.has(s));
  if (!allFour) return "partial";
  return subjectScores.every((s) => s.passed) ? "pass" : "fail";
}

export interface SecondaryScore {
  /** 科目別の獲得点（満点換算）と満点。 */
  perSubject: Array<{ subject: Subject; points: number; max: number }>;
  /** 合計獲得点。 */
  totalPoints: number;
  /** 合計満点（出題された科目の満点合計）。 */
  totalMax: number;
  /** 合計の得点率(0..100, 整数)。 */
  scorePct: number;
  /** 合算で合格ライン(108/180=60%)以上か。両科目が揃っていなくても出題分の満点に対する60%で判定する。 */
  passed: boolean;
}

/**
 * 二次の採点（#48）。電力管理(120点満点)＋機械制御(60点満点)の **合算** で判定する。
 *
 * 各科目の得点は「その科目の正答率 × 満点」で換算する（記述の自己採点正誤を満点換算）。
 * 合否は合計得点 ÷ 合計満点 ≥ 60%（本番の 108/180）。科目別ではない。
 *
 * @param set 出題セット（科目から満点を引く）
 * @param results 出題順の正誤（記述は自己採点の正誤相当）
 */
export function scoreSecondary(set: Problem[], results: boolean[]): SecondaryScore {
  const bySub = new Map<Subject, { correct: number; total: number }>();
  set.forEach((p, i) => {
    const cur = bySub.get(p.subject) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (results[i]) cur.correct += 1;
    bySub.set(p.subject, cur);
  });
  const perSubject: SecondaryScore["perSubject"] = [];
  let totalPoints = 0;
  let totalMax = 0;
  for (const [subject, { correct, total }] of bySub) {
    const max = SECONDARY_MAX_POINTS[subject] ?? 0;
    const points = total > 0 ? (correct / total) * max : 0;
    perSubject.push({ subject, points, max });
    totalPoints += points;
    totalMax += max;
  }
  const scorePct = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0;
  return {
    perSubject,
    totalPoints: Math.round(totalPoints),
    totalMax,
    scorePct,
    // 出題された科目の満点合計に対する60%で判定（本番は両科目で 108/180）。
    passed: totalMax > 0 && totalPoints >= totalMax * 0.6,
  };
}
