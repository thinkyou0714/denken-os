/**
 * prereq.ts — 前提科目順(理論優先)で弱点 topic を並べ替える（D3）。
 * 電験は「理論」が他科目の前提という強い依存構造を持つ。弱点が複数あるとき、前提科目(理論)の
 * topic を依存先より先に出すのが学習効率の定石。subject は data 由来で堅牢（topic 間の手書き辺に依存しない）。
 */
export function prioritizeFoundationFirst(
  topics: string[],
  subjectOf: (topic: string) => string | undefined,
  foundationSubject = "理論",
): string[] {
  // 安定ソート: 前提科目を先頭へ寄せ、同種内は元の優先順(index)を保つ。
  return topics
    .map((t, i) => ({ t, i, isFoundation: subjectOf(t) === foundationSubject }))
    .sort((a, b) => (a.isFoundation === b.isFoundation ? a.i - b.i : a.isFoundation ? -1 : 1))
    .map((x) => x.t);
}
