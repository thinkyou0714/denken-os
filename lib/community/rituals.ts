/**
 * rituals.ts — コミュニティBotの「儀式」純ロジック（08-community-bot）。
 * 自動化するのは儀式（チェックイン/もくもく会リマインド/出戻り歓迎/卒業ロール）。
 * 関係性（個別の励まし・深い相談）は人間。実 Bot(discord.js) はこの純関数を呼ぶアダプタ。
 */
import { DAY_MS } from "../shared/time.js";

export interface MemberActivity {
  handle: string;
  lastSeenMs: number;
  /** 合格報告済みか。 */
  passed: boolean;
}

/** 朝/夜のチェックイン投稿文。 */
export function checkinMessage(period: "morning" | "evening"): string {
  return period === "morning"
    ? "🌅 今日の予定を一言で！「今日は◯◯を△分」みたいに宣言すると続きます。"
    : "🌙 今日の結果を一言で。できた人もできなかった人も、記録するだけで前進。";
}

/** 週次もくもく会のリマインド。 */
export function mokumokuReminder(when: string): string {
  return `📚 今週のもくもく会は ${when} から。来られる人は👍、作業だけでもOK。`;
}

/**
 * 久々ログインへの「出戻り歓迎」文（罪悪感を与えない）。
 * thresholdDays 以上不在のメンバーが対象。
 */
export function returningWelcome(handle: string): string {
  return `おかえりなさい ${handle} さん！ ブランクは気にせず、今日からまた一緒に。まずは一問だけでも。`;
}

/** 出戻り歓迎の対象を選ぶ（罪悪感ナッジではなく歓迎）。 */
export function selectReturningMembers(members: MemberActivity[], nowMs: number, thresholdDays = 7): string[] {
  const threshold = thresholdDays * DAY_MS;
  return members.filter((m) => !m.passed && nowMs - m.lastSeenMs >= threshold).map((m) => m.handle);
}

export type RoleAction = { handle: string; grantRole: "卒業生" } | null;

/** 合格報告→「卒業生」ロール付与の判定（社会的証明の可視化）。 */
export function graduationRole(member: MemberActivity): RoleAction {
  return member.passed ? { handle: member.handle, grantRole: "卒業生" } : null;
}

/** 質問はまずコミュニティへ誘導（Community-Led Growth: 自分が全部答えない）。 */
export function questionRedirect(): string {
  return "❓質問は #質問 チャンネルへどうぞ。先輩・同期が答えてくれます（回答者には感謝リアクションを！）。";
}
