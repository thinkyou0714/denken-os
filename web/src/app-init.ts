/**
 * app-init.ts — 問題データ読込（reloadProblems）。
 * views/practice.ts から参照するための薄いモジュール。
 *
 * ## 分割ロード対応
 * 在庫が数万問規模になると単一 problems.json（数十MB）の一括 fetch/parse が
 * 初期コスト・メモリピークのボトルネックになる。そこで科目別シャード
 * （web/problems/<slug>.json）＋マニフェスト（web/problems/manifest.json）から
 * 読み込む。マニフェストが取れない/壊れている場合（古いキャッシュ等）は従来の
 * combined problems.json にフォールバックする（後方互換・オフライン安全）。
 *
 * II-164: 既読フラグで二重ロード防止。
 * II-165: onlineイベントで自動reloadProblems（app.ts側で登録）。
 */
import type { Problem } from "../../lib/engine/schema.js";
import { loadServiceProblems } from "./service/catalog.js";
import { setLoadFailed, setProblems } from "./state/app.js";
import { render } from "./views/router.js";

/** 二重ロード防止フラグ（II-164）: すでにロード中のときは重複fetchをしない。 */
let _loading = false;

/** 問題データの取得。失敗してもアプリは起動し、学習タブにリトライ導線を出す。
 *
 *  読み込み経路: まず科目別シャード（manifest 駆動）→ 失敗したら combined problems.json。
 *  どちらも失敗したら loadFailed フローへ乗せる。
 *
 *  II-164: visibilitychange等での二重ロードを防ぐ既読フラグ付き。
 */
export async function reloadProblems(): Promise<void> {
  // 二重ロード防止（II-164）。
  if (_loading) return;
  _loading = true;
  try {
    const data: Problem[] = await loadServiceProblems();
    setProblems(data);
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
