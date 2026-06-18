/**
 * ui/toast-queue.ts — トーストの順次表示キュー（DOM 非依存の純ロジック）。
 *
 * 連続した showToast 呼び出し（祝賀の重なり等）を1件ずつ順番に表示するための機構。
 * 実際の DOM 描画は呼び出し側が render コールバックで行い、表示が終わったら done() を呼ぶ。
 * こうして DOM から分離することで、キューの順序保証を node 環境で単体テストできる。
 */

export interface ToastRequest {
  message: string;
  actionLabel: string;
  action: () => void;
  autoCloseMs: number;
}

/** 1件を表示する関数。表示完了（自動消滅 or 手動クローズ）時に done を呼ぶ契約。 */
export type ToastRenderer = (req: ToastRequest, done: () => void) => void;

export class ToastQueue {
  private queue: ToastRequest[] = [];
  /** 現在表示中か（多重表示を防ぎ、1件ずつ順次出すためのフラグ）。 */
  private showing = false;

  constructor(private render: ToastRenderer) {}

  /** トースト要求を積む。表示中でなければ即座に次を表示する。 */
  push(req: ToastRequest): void {
    this.queue.push(req);
    if (!this.showing) this.showNext();
  }

  private showNext(): void {
    const req = this.queue.shift();
    if (!req) {
      this.showing = false;
      return;
    }
    this.showing = true;
    let advanced = false;
    // done は1回だけ有効（自動消滅とクローズの二重発火で順序が崩れるのを防ぐ）。
    const done = (): void => {
      if (advanced) return;
      advanced = true;
      this.showNext();
    };
    this.render(req, done);
  }

  /** キューと表示状態をリセットする（テスト用）。 */
  reset(): void {
    this.queue.length = 0;
    this.showing = false;
  }
}
