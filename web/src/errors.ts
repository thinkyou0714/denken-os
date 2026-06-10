/**
 * errors.ts — エラーバウンダリの純ロジック。
 *
 * 根本対策: 描画中に例外が出るとSPA全体が白画面になり、学習記録は無事でも
 * 「壊れた」と受け取られて離脱する。例外を捕捉し、安心メッセージ＋復旧導線を
 * 出すための表示テキストをここで組み立てる（DOM 生成は app.ts 側）。
 */

/** 例外から、ユーザーに見せる安全な詳細文字列を取り出す（過剰な内部情報は出さない）。 */
export function errorDetail(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "原因不明のエラー";
  }
}

export interface RecoveryView {
  title: string;
  /** 学習記録が消えていないことを明示して安心させる。 */
  reassurance: string;
  detail: string;
}

/** 復旧画面に出す文言を組み立てる。 */
export function recoveryView(err: unknown): RecoveryView {
  return {
    title: "表示中に問題が発生しました",
    reassurance: "学習記録は安全に保存されています。再読み込みで復帰できます。",
    detail: errorDetail(err),
  };
}
