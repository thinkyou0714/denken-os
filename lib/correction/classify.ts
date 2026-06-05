/**
 * classify.ts — 誤り訂正モニタの分類ヒューリスティック（10-correction-monitor）。
 * 検知は自動・訂正/撤回の実行は人間承認（任意リプで自動撤回しない＝荒らし悪用防止）。
 * ここは「誤り指摘っぽさ」を分類して人間にフラグを上げる純関数。LLM分類は補助。
 */

export interface ReplyCandidate {
  id: string;
  authorHandle: string;
  text: string;
}

export interface CorrectionFlag {
  replyId: string;
  authorHandle: string;
  score: number; // 0..1 誤り指摘らしさ
  isLikelyCorrection: boolean;
  matched: string[];
}

const CUE_PATTERNS: { re: RegExp; weight: number }[] = [
  { re: /(間違|誤り|誤字|ミス|おかしい|変では)/, weight: 0.4 },
  { re: /(正しく(は|くは)|正解は|本当は|では(なく|なくて))/, weight: 0.35 },
  { re: /(√3|ルート3|力率|単位|計算|答え|選択肢)/, weight: 0.15 },
  { re: /(\d+(?:\.\d+)?\s*(?:kW|W|V|A|Ω|ohm))/i, weight: 0.15 },
  { re: /[?？]$/, weight: 0.1 },
];

/** 既定の判定閾値。実データで再較正できるよう引数で上書き可能にしてある。 */
export const DEFAULT_THRESHOLD = 0.5;

export function classifyReply(reply: ReplyCandidate, threshold: number = DEFAULT_THRESHOLD): CorrectionFlag {
  let score = 0;
  const matched: string[] = [];
  for (const { re, weight } of CUE_PATTERNS) {
    if (re.test(reply.text)) {
      score += weight;
      matched.push(re.source);
    }
  }
  score = Math.min(1, score);
  return {
    replyId: reply.id,
    authorHandle: reply.authorHandle,
    score,
    isLikelyCorrection: score >= threshold,
    matched,
  };
}

/** 誤り指摘候補を抽出（人間にフラグを上げる対象）。閾値は実データで較正可能。 */
export function flagCorrections(replies: ReplyCandidate[], threshold: number = DEFAULT_THRESHOLD): CorrectionFlag[] {
  return replies.map((r) => classifyReply(r, threshold)).filter((f) => f.isLikelyCorrection);
}

/** 訂正リプ下書き（消さない・指摘者クレジット欄あり・人間が承認して投稿）。 */
export function draftCorrectionReply(opts: {
  problemId: string;
  reporterHandle: string;
  correctAnswer: string;
}): string {
  return [
    `ご指摘ありがとうございます（${opts.reporterHandle} さんの指摘で確認）。`,
    `${opts.problemId} に誤りがありました。正しくは「${opts.correctAnswer}」です。`,
    `元の投稿は経緯を残すため削除せず、この訂正をぶら下げています。アプリ側のデータも修正しました。`,
  ].join("\n");
}
