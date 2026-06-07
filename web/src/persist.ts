/**
 * persist.ts — navigator.storage.persist() の要求判断（純ロジック）。
 * best-effort ストレージはディスク逼迫時に無通知で evict されうる。連続日数/復習状態が消えると
 * 中核価値(継続)が崩れるため persist を要求する。ただし意味あるデータがあり未 persist のときだけ
 * 要求して、初回起動の無意味な許可要求ノイズを避ける。
 */
export function shouldRequestPersist(opts: { persisted: boolean; hasMeaningfulData: boolean }): boolean {
  return !opts.persisted && opts.hasMeaningfulData;
}
