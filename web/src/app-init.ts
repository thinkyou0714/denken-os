/**
 * app-init.ts — problems.json 読込（reloadProblems）。
 * views/practice.ts から参照するための薄いモジュール。
 *
 * II-164: 既読フラグで二重ロード防止。
 * II-165: onlineイベントで自動reloadProblems（app.ts側で登録）。
 */
import type { Problem } from "../../lib/engine/schema.js";
import { setLoadFailed, setProblems } from "./state/app.js";
import { render } from "./views/router.js";

/** 二重ロード防止フラグ（II-164）: すでにロード中のときは重複fetchをしない。 */
let _loading = false;

/** 問題データの取得。失敗してもアプリは起動し、学習タブにリトライ導線を出す。
 *  problems.json の最低限の検証（I-061）:
 *  - 配列であること
 *  - 先頭要素に id / statement / answer / solution があること
 *  不正なら loadFailed フローへ乗せる。
 *
 *  II-164: visibilitychange等での二重ロードを防ぐ既読フラグ付き。
 */
export async function reloadProblems(): Promise<void> {
  // 二重ロード防止（II-164）。
  if (_loading) return;
  _loading = true;
  try {
    const res = await fetch("./problems.json");
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as unknown;
    // 軽量検証（I-061）
    if (!Array.isArray(data)) {
      throw new Error("problems.json は配列である必要があります");
    }
    if (data.length > 0) {
      const first = data[0] as Record<string, unknown>;
      for (const key of ["id", "statement", "answer", "solution"] as const) {
        if (!(key in first)) {
          throw new Error(`problems.json の先頭要素に "${key}" がありません`);
        }
      }
    }
    setProblems(data as Problem[]);
    setLoadFailed(false);
  } catch (err) {
    console.warn("[app] reloadProblems 失敗:", err);
    setProblems([]);
    setLoadFailed(true);
  } finally {
    _loading = false;
  }
  render();
}
