/**
 * primitives.ts — 図ビルダー共通プリミティブヘルパー（II-128/II-129）。
 *
 * 軸・目盛・ラベル生成の重複を抽出したモジュール。
 * すべての関数は svg.ts のプリミティブのみを用いる純関数で、
 * 返す文字列は figures/index.ts の各ビルダーが直接インライン生成していた
 * SVG 断片と **完全に同一** になるよう設計している。
 *
 * ## II-128: svgLabel — SVG ラベル専用フォーマッタ
 *
 * figures/index.ts 内の局所 `fmt()` は SVG 図内ラベル専用だが、
 * その用途が名前から不明瞭だった。`svgLabel` という名前でエクスポートし、
 * 誤用を防ぐ。
 *
 * ⚠️ SVG 図内の軸ラベル・寸法表示専用。問題データの整形には使わないこと。
 *   問題テキスト/選択肢/解説 → clean.ts の formatClean / formatKW を使用。
 *
 * ## II-129: 共通プリミティブ
 *
 * - verticalTick(): torqueSlipFigure の滑り目盛マーカー（破線+ラベル）を抽出。
 *   `line(x,oy,x,top,'stroke-dasharray="2 2"') + text(x,oy+18,label,TC)` パターン。
 *
 * - loopFrame(): figures/index.ts のプライベート loopFrame と同一実装を公開エクスポート。
 *   直列回路（maxPower/seriesRC/resistorLadder）で再利用可能。
 */

import { line, source, text } from "./svg.js";

/**
 * SVG ラベル専用の数値整形関数（II-128: fmt() の公開エイリアス）。
 *
 * 用途の違い（clean.ts 系との使い分け）:
 *  - svgLabel(): SVG 図内の軸ラベル・寸法表示専用。toFixed(2) で2桁揃え、末尾ゼロは
 *    Number() で除去する。ビジュアル表示の都合で小数点以下2桁以内に丸める。
 *  - formatClean() (clean.ts): 問題の答え・選択肢・解説テキスト内の数値整形に使用。
 *  - formatKW() (clean.ts): 電力(W) を kW 表記に変換する特定用途の整形。
 *
 * ⚠️ SVG ラベル以外の数値整形には formatClean/formatKW を使うこと。
 */
export function svgLabel(n: number): string {
  return String(Number(n.toFixed(2)));
}

/**
 * 垂直方向の破線目盛線とラベルを生成する（II-129: 目盛マーカー共通ヘルパー）。
 *
 * torqueSlipFigure で繰り返されるパターン:
 *   `line(x, oy, x, tickTopY, 'stroke-dasharray="2 2"') + text(x, oy+18, label, TC)`
 * を一か所に集約する。
 *
 * @param x       目盛の x 座標
 * @param oy      軸の y 座標（目盛の基点）
 * @param tickTopY 目盛線の上端 y 座標
 * @param label   軸下に表示するラベル文字列
 * @param TC      text 要素に付与する属性文字列（例: 'text-anchor="middle"'）
 *
 * 出力は以下と完全に同一:
 *   line(x, oy, x, tickTopY, 'stroke-dasharray="2 2"') +
 *   text(x, oy + 18, label, TC)
 */
export function verticalTick(x: number, oy: number, tickTopY: number, label: string, TC: string): string {
  return line(x, oy, x, tickTopY, 'stroke-dasharray="2 2"') + text(x, oy + 18, label, TC);
}

/**
 * 矩形ループの左辺＋電源＋下辺の共通部品（II-129: 回路フレーム公開エクスポート）。
 *
 * figures/index.ts のプライベート `loopFrame()` と同一実装。
 * 上辺は呼び出し側が描く。rightX は右辺の x 座標。
 *
 * 出力は figures/index.ts の loopFrame(sourceSym, sourceLabel, rightX) と完全に同一。
 */
export function loopFrame(sourceSym: string, sourceLabel: string, rightX: number): string {
  return [
    source(40, 70, 20, sourceSym, sourceLabel),
    line(40, 50, 40, 30),
    line(40, 90, 40, 110),
    line(40, 110, rightX, 110),
    line(rightX, 110, rightX, 30),
  ].join("");
}
