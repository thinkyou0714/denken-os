/**
 * gear-guide.ts — 教材ガイドの静的データ（純ロジック）。17-A5/A6-A13/A10/A11。
 *
 * 方針:
 *  - 書誌はキーワード（書名）だけを持ち、リンクは検索結果 URL を生成する
 *    （改訂・絶版による ASIN 陳腐化を回避。lib/bridge/links.ts）。
 *  - amazonTag 未設定でもガイド自体は表示する（選び方の解説だけで独学者に価値がある）。
 *    タグ設定時のみアフィリエイトになり、表示側で開示バッジを必ず添える。
 *  - 電卓は「一般電卓のみ持込可（関数電卓・プログラム電卓は不可）」という試験規定が
 *    最重要情報。ガイド冒頭に規定解説を置き、紹介対象も一般電卓に限定する。
 */

import { amazonSearchUrl } from "../../lib/bridge/links.js";
import { BRIDGE, type BridgeConfig } from "./bridge-config.js";

export interface GearItem {
  /** 表示名（書名・商品種別）。 */
  title: string;
  /** 一言の位置づけ（誇張しない事実ベース）。 */
  note: string;
  /** 検索リンク生成用キーワード。 */
  keyword: string;
}

export interface GearSection {
  id: string;
  heading: string;
  /** セクション冒頭の説明（選び方・注意）。 */
  intro: string;
  items: GearItem[];
}

/** 電卓持込規定の解説（A11）。リンクの有無に関わらず常に表示する正確性ガード。 */
export const CALCULATOR_RULE_NOTE =
  "電験の試験で使えるのは四則演算・√・%・メモリ程度の「一般電卓」のみです。" +
  "関数電卓・プログラム機能付き・印字機能付き・音の出る電卓は持ち込めません。" +
  "規定は変わり得るため、必ず最新の受験案内（電気技術者試験センター）で確認してください。";

/**
 * 教材ガイドのセクション定義。
 * 書名はシリーズ名までに留め、版・年度はキーワード検索で吸収する（断定表記しない）。
 */
export const GEAR_SECTIONS: readonly GearSection[] = [
  {
    id: "primary",
    heading: "一次試験の定番",
    intro: "まず1シリーズを決めて全科目を一周するのが定石。迷ったら定番から。",
    items: [
      {
        title: "これだけシリーズ（電験第2種）",
        note: "一次の定番入門。数学〜法規まで科目別",
        keyword: "電験二種 これだけ",
      },
      { title: "完全マスター 電験二種", note: "これだけの次の一冊。網羅性重視", keyword: "完全マスター 電験二種" },
      { title: "電験二種 一次試験過去問", note: "仕上げは過去問演習が必須", keyword: "電験二種 一次試験 過去問" },
    ],
  },
  {
    id: "secondary",
    heading: "二次試験（本丸）",
    intro: "二種は二次が本丸。計算力と論述の型を作る教材を早めに。",
    items: [
      { title: "戦術で覚える！シリーズ", note: "二次計算問題対策の定番", keyword: "戦術で覚える 電験" },
      {
        title: "電験二種 模範解答集（二次）",
        note: "記述の型は模範解答から盗む",
        keyword: "電験二種 二次試験 模範解答集",
      },
    ],
  },
  {
    id: "calculator",
    heading: "電卓（規定に注意）",
    intro: CALCULATOR_RULE_NOTE,
    items: [
      {
        title: "12桁 実務電卓（カシオ/シャープ）",
        note: "√キー付き・一般電卓。使い慣れたキー配列で本番へ",
        keyword: "電卓 12桁 実務 √",
      },
    ],
  },
  {
    id: "practice",
    heading: "実務・合格後",
    intro: "合格後・実務者向け。試験勉強と並行して眺めると法規の解像度が上がる。",
    items: [
      { title: "電気設備技術基準とその解釈", note: "法規の原典。実務でも必携", keyword: "電気設備技術基準とその解釈" },
    ],
  },
];

/** 項目のリンク URL（amazonTag 未設定なら素の検索リンク）。 */
export function gearItemUrl(item: GearItem, cfg: BridgeConfig = BRIDGE): string {
  return amazonSearchUrl(item.keyword, cfg.amazonTag);
}
