/**
 * tests/web/toast-queue.test.ts — トーストの順次表示キュー（II-11）。
 *
 * DOM 非依存の ToastQueue が、連続 push を1件ずつ順番に表示すること（前のトーストを
 * 潰さない）を検証する。render コールバックの done() を呼ぶことで次へ進む契約をテストする。
 */
import { describe, expect, it } from "vitest";
import { ToastQueue, type ToastRequest } from "../../web/src/ui/toast-queue.js";

function req(message: string): ToastRequest {
  return { message, actionLabel: "OK", action: () => {}, autoCloseMs: 0 };
}

describe("ToastQueue（順次表示）", () => {
  it("連続 push しても1件ずつ順番に表示される（最後の1件に潰れない）", () => {
    const shown: string[] = [];
    // 現在表示中の done を配列末尾に積む（クロージャ再代入の型narrowing回避）。
    const dones: Array<() => void> = [];
    const q = new ToastQueue((r, done) => {
      shown.push(r.message);
      dones.push(done);
    });

    q.push(req("A"));
    q.push(req("B"));
    q.push(req("C"));

    // 最初は A のみ表示中（残りはキュー待ち）。
    expect(shown).toEqual(["A"]);

    // A を閉じると B、B を閉じると C が順に出る（直近の done を呼ぶ）。
    dones[dones.length - 1]?.();
    expect(shown).toEqual(["A", "B"]);
    dones[dones.length - 1]?.();
    expect(shown).toEqual(["A", "B", "C"]);
    dones[dones.length - 1]?.();
    // 以降は空。done を呼んでも増えない。
    expect(shown).toEqual(["A", "B", "C"]);
  });

  it("done を二重に呼んでも順序は崩れない（多重発火ガード）", () => {
    const shown: string[] = [];
    const dones: Array<() => void> = [];
    const q = new ToastQueue((r, done) => {
      shown.push(r.message);
      dones.push(done);
    });
    q.push(req("A"));
    q.push(req("B"));
    expect(shown).toEqual(["A"]);
    // A の done を2回呼んでも B が1回だけ出る。
    dones[0]?.();
    dones[0]?.();
    expect(shown).toEqual(["A", "B"]);
  });

  it("即時 done なら push 順に全件が一気に流れる", () => {
    const shown: string[] = [];
    const q = new ToastQueue((r, done) => {
      shown.push(r.message);
      done(); // すぐ次へ。
    });
    q.push(req("1"));
    q.push(req("2"));
    q.push(req("3"));
    expect(shown).toEqual(["1", "2", "3"]);
  });

  it("reset でキューと表示状態が空に戻る", () => {
    const shown: string[] = [];
    const dones: Array<() => void> = [];
    const q = new ToastQueue((r, done) => {
      shown.push(r.message);
      dones.push(done);
    });
    q.push(req("A"));
    q.push(req("B"));
    q.reset();
    // reset 後の push は新規シーケンスとして即表示される（B は破棄済み）。
    q.push(req("X"));
    expect(shown).toEqual(["A", "X"]);
    // done を呼んでも空キューなので増えない。
    dones[dones.length - 1]?.();
    expect(shown).toEqual(["A", "X"]);
  });
});
