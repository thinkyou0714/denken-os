import type { StorageBackend } from "@/domain/storage/backend";

/** 同時に保有可能なストリーク・フリーズの上限。 */
const MAX_FREEZES = 4;
/** 月初に付与される枚数(上限まで)。 */
const FREEZES_PER_MONTH = 2;

interface SettingsState {
  version: 1;
  examDate: string | null; // YYYY-MM-DD
  minimalUI: boolean;
  freezes: number;
  /** 最後にフリーズを月次付与した月 (YYYY-MM)。 */
  freezeLastGrantedMonth: string | null;
  /** 自信度トラッキングを有効化(メタ認知矯正用、解答前に低/中/高を選択)。 */
  confidenceTracking: boolean;
}

function emptyState(): SettingsState {
  return {
    version: 1,
    examDate: null,
    minimalUI: false,
    freezes: 0,
    freezeLastGrantedMonth: null,
    confidenceTracking: false,
  };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 設定(受験日 / 最小UI / フリーズ枚数)を永続化する。
 * 初期化時に "未付与の月" を検出してフリーズを上限まで補充する。
 */
export class SettingsStore {
  private state: SettingsState;

  constructor(
    private readonly backend: StorageBackend,
    now: Date = new Date(),
  ) {
    this.state = this.load();
    this.grantFreezesIfNeeded(now);
  }

  private load(): SettingsState {
    const raw = this.backend.read();
    if (!raw) return emptyState();
    try {
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      return {
        version: 1,
        examDate: parsed.examDate ?? null,
        minimalUI: Boolean(parsed.minimalUI),
        freezes:
          typeof parsed.freezes === "number" && parsed.freezes >= 0
            ? Math.min(MAX_FREEZES, parsed.freezes)
            : 0,
        freezeLastGrantedMonth: parsed.freezeLastGrantedMonth ?? null,
        confidenceTracking: Boolean(parsed.confidenceTracking),
      };
    } catch {
      return emptyState();
    }
  }

  private persist(): void {
    this.backend.write(JSON.stringify(this.state));
  }

  private grantFreezesIfNeeded(now: Date): void {
    const current = monthKey(now);
    if (this.state.freezeLastGrantedMonth === current) return;
    this.state.freezes = Math.min(
      MAX_FREEZES,
      this.state.freezes + FREEZES_PER_MONTH,
    );
    this.state.freezeLastGrantedMonth = current;
    this.persist();
  }

  get examDate(): string | null {
    return this.state.examDate;
  }
  setExamDate(date: string | null): void {
    this.state.examDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
    this.persist();
  }

  get minimalUI(): boolean {
    return this.state.minimalUI;
  }
  setMinimalUI(v: boolean): void {
    this.state.minimalUI = v;
    this.persist();
  }

  get freezes(): number {
    return this.state.freezes;
  }
  get maxFreezes(): number {
    return MAX_FREEZES;
  }

  get confidenceTracking(): boolean {
    return this.state.confidenceTracking;
  }
  setConfidenceTracking(v: boolean): void {
    this.state.confidenceTracking = v;
    this.persist();
  }
}

/** 受験日までの残日数。examDate が無効/未設定なら null。 */
export function daysUntilExam(
  examDate: string | null,
  today: Date,
): number | null {
  if (!examDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(examDate);
  if (!m) return null;
  const exam = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    0,
    0,
    0,
    0,
  );
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const ms = exam.getTime() - t.getTime();
  return Math.ceil(ms / 86_400_000);
}
