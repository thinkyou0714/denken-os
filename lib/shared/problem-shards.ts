/**
 * problem-shards.ts — 問題データの「科目別シャード」構成の単一の真実。
 *
 * 目的（分割ロード対応）:
 *   在庫が数万問規模に育つと、単一の web/problems.json（数十MB）を一括で
 *   fetch/parse する初期コスト・メモリピーク・GitHub のファイルサイズ制約が
 *   ボトルネックになる。そこで問題を科目ごとの小さな JSON（シャード）に分割し、
 *   マニフェスト（shards の索引）から読み込む構成にする。
 *
 *   このモジュールは build（scripts/build-problems.ts）・web（web/src/app-init.ts）・
 *   Service Worker のプリキャッシュ（scripts/build-web.ts が版数計算に使用）・テストの
 *   すべてが同じ slug/パス規約を参照するための共有定義。ここを変えれば全経路が追随する。
 *
 * 不変条件:
 *   - slug は URL/ファイル名として安全な ASCII（日本語の科目名をそのままパスにしない）。
 *   - slug は科目間で一意。
 *   - 全6科目を網羅する（欠けると build:problems の型エラーで気づける）。
 */
import type { Subject } from "../engine/schema.js";

/**
 * 科目 → シャードの slug（ファイル名の語幹）。
 * 値を変えると既存のキャッシュ済みシャードURLが変わるため、みだりに変更しない。
 */
export const SUBJECT_SLUGS: Record<Subject, string> = {
  理論: "theory",
  電力: "power",
  機械: "machine",
  法規: "law",
  電力管理: "power-mgmt",
  機械制御: "machine-ctrl",
};

/** マニフェスト/シャードを置くディレクトリ（web/ からの相対）。 */
export const SHARD_DIR = "problems";

/** マニフェストのファイル名（SHARD_DIR 配下）。 */
export const MANIFEST_FILE = "manifest.json";

/** 全科目の slug 一覧（決定論的な順序＝SUBJECT_SLUGS の宣言順）。 */
export function allShardSlugs(): string[] {
  return Object.values(SUBJECT_SLUGS);
}

/** 科目 → シャードのファイル名（例: "theory.json"）。 */
export function shardFileName(subject: Subject): string {
  return `${SUBJECT_SLUGS[subject]}.json`;
}

/** マニフェスト1件分のシャード記述子。 */
export interface ShardEntry {
  /** 科目名（日本語・schema の Subject）。 */
  subject: Subject;
  /** URL/ファイル名安全な slug。 */
  slug: string;
  /** シャードファイル名（SHARD_DIR 配下・例: "theory.json"）。 */
  file: string;
  /** このシャードに含まれる問題数。 */
  count: number;
}

/** 問題データのマニフェスト（シャードの索引）。 */
export interface ProblemManifest {
  /** 内容由来の版数（決定論的・タイムスタンプは含めない）。変更検知に使う。 */
  version: string;
  /** 全シャードの合計問題数。 */
  total: number;
  /** シャード記述子（決定論的な順序）。 */
  shards: ShardEntry[];
}
