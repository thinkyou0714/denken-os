/**
 * 図ビルダー — topic ごとに facts を受け取り、説明用のインライン SVG を返す純関数群。
 * すべて svg.ts のプリミティブで構成し、オフライン/最小依存・テーマ追従・a11y を満たす。
 * レイアウトは「上辺y=30 / 下辺y=110 / 左辺x=40 の矩形ループ＋左に電源」を基本形にする。
 *
 * 共通プリミティブ（primitives.ts）:
 *  - svgLabel(): SVG 図内数値整形（II-128: 誤用防止のための公開エイリアス）
 *  - verticalTick(): 破線目盛線＋ラベル（II-129）
 *  - loopFrame(): 回路ループフレーム（primitives.ts の公開版と同一実装）
 */
import { svgLabel, verticalTick } from "./primitives.js";
import { arrow, circle, dot, line, polyline, rect, resistorH, resistorV, source, svg, text } from "./svg.js";

/**
 * SVG ラベル用の数値整形関数（II-128: SVG 内表記専用 — primitives.ts の svgLabel() を参照）。
 *
 * 用途の違い（clean.ts 系との使い分け）:
 *  - fmt() / svgLabel(): SVG 図内の軸ラベル・寸法表示専用。toFixed(2) で2桁揃え、末尾ゼロは
 *    Number() で除去する。ビジュアル表示の都合で小数点以下2桁以内に丸める。
 *  - formatClean() (clean.ts): 問題の答え・選択肢・解説テキスト内の数値整形に使用。
 *    ルールは同様だが、文脈は「問題データ」。
 *  - formatKW() (clean.ts): 電力(W) を kW 表記に変換する特定用途の整形。
 *
 * ⚠️ SVG ラベル以外の数値整形には formatClean/formatKW を使うこと。
 * 外部から参照する場合は primitives.ts の svgLabel() を使用すること（II-128）。
 */
const fmt: (n: number) => string = svgLabel;
const TC = 'text-anchor="middle"';

/** 矩形ループの左辺＋電源＋下辺の共通部品（上辺は呼び出し側で描く）。 */
function loopFrame(sourceSym: string, sourceLabel: string, rightX: number): string {
  return [
    source(40, 70, 20, sourceSym, sourceLabel),
    line(40, 50, 40, 30),
    line(40, 90, 40, 110),
    line(40, 110, rightX, 110),
    line(rightX, 110, rightX, 30),
  ].join("");
}

/** 三相 Y 結線負荷（1相 Z=R+jX）。 */
export function threePhaseYFigure(V: number, R: number, X: number): string {
  const body = [
    source(45, 70, 22, "3φ", `線間 ${fmt(V)}V`),
    line(67, 70, 105, 70),
    dot(105, 70),
    line(105, 40, 105, 100),
    resistorH(105, 40, 70, `Z=${fmt(R)}+j${fmt(X)}`),
    resistorH(105, 70, 70, "Z"),
    resistorH(105, 100, 70, "Z"),
    line(175, 40, 200, 40),
    line(175, 70, 200, 70),
    line(175, 100, 200, 100),
    line(200, 40, 200, 100),
    dot(200, 70),
    text(208, 74, "N"),
  ].join("");
  return svg({ width: 240, height: 130, title: `三相Y結線負荷 線間電圧${fmt(V)}V、1相 Z=${fmt(R)}+j${fmt(X)}Ω` }, body);
}

/** テブナン等価電源 E・内部抵抗 R に整合負荷 R_L=R を接続（最大電力）。 */
export function maxPowerFigure(E: number, R: number): string {
  const body = [
    loopFrame("E", `${fmt(E)}V`, 230),
    resistorH(70, 30, 70, `R=${fmt(R)}Ω`),
    resistorV(230, 35, 70, `R_L=${fmt(R)}Ω`),
    text(150, 126, "整合 R_L=R で最大電力 E²/(4R)", TC),
  ].join("");
  return svg({ width: 270, height: 140, title: `内部抵抗R=${fmt(R)}Ωの電源Eに整合負荷R_Lを接続` }, body);
}

/** R-C 直列回路（時定数 τ=RC）。 */
export function seriesRCFigure(R: number, C: number): string {
  const cap = [line(190, 30, 190, 60), line(176, 60, 204, 60), line(176, 68, 204, 68), line(190, 68, 190, 110)].join(
    "",
  );
  const body = [
    loopFrame("V", "", 190),
    resistorH(70, 30, 80, `R=${fmt(R)}kΩ`),
    line(150, 30, 190, 30),
    cap,
    text(210, 66, `C=${fmt(C)}μF`),
    text(115, 126, "τ=R·C", TC),
  ].join("");
  return svg({ width: 250, height: 140, title: `抵抗R=${fmt(R)}kΩとコンデンサC=${fmt(C)}μFの直列RC回路` }, body);
}

/** ホイートストンブリッジ（平衡 R1·Rx=R2·R3、中央に検流計 G）。 */
export function wheatstoneFigure(R1: number, R2: number, R3: number, Rx: number): string {
  const top = 140;
  const body = [
    line(55, 80, top, 25),
    line(top, 25, 225, 80),
    line(55, 80, top, 135),
    line(225, 80, top, 135),
    text(78, 44, `R1=${fmt(R1)}`),
    text(185, 44, `R2=${fmt(R2)}`),
    text(74, 120, `Rx=${fmt(Rx)}`),
    text(184, 120, `R3=${fmt(R3)}`),
    line(55, 80, 225, 80),
    circle(140, 80, 12, 'fill="none"'),
    text(140, 84, "G", TC),
    dot(top, 25),
    dot(top, 135),
    line(top, 25, top, 10),
    line(top, 135, top, 150),
    text(top + 8, 16, "電源"),
  ].join("");
  return svg(
    {
      width: 280,
      height: 158,
      title: `ホイートストンブリッジ R1=${fmt(R1)},R2=${fmt(R2)},R3=${fmt(R3)},Rx=${fmt(Rx)}（平衡）`,
    },
    body,
  );
}

/** 電力ベクトル（電力三角形）: 有効P・無効Q1→Q2、進相Qcで改善。 */
export function powerTriangleFigure(P: number, Q1: number, Q2: number, unit: string): string {
  const ox = 45;
  const oy = 120;
  const scale = 150 / Math.max(P, Q1, 1);
  const px = ox + P * scale;
  const y1 = oy - Q1 * scale;
  const y2 = oy - Q2 * scale;
  const body = [
    arrow(ox, oy, px, oy, `P=${fmt(P)}`),
    line(ox, oy, ox, y1, 'stroke-dasharray="3 3"'),
    line(px, oy, px, y1, 'stroke-dasharray="3 3"'),
    line(ox, y1, px, y1, 'stroke-dasharray="3 3"'),
    arrow(ox, oy, px, y1, "S(前)"),
    arrow(ox, oy, px, y2, "S(後)"),
    arrow(px - 14, y1, px - 14, y2, ""),
    text(px - 10, (y1 + y2) / 2, `Qc=${fmt(Q1 - Q2)}`),
  ].join("");
  return svg(
    { width: 280, height: 150, title: `電力三角形: 進相容量Qc=${fmt(Q1 - Q2)}${unit}で無効電力を低減（力率改善）` },
    body,
  );
}

/** 単相2線式線路（R,X）と負荷。 */
export function singleLineDropFigure(I: number, R: number, X: number, cos: number): string {
  const reactor = polyline(
    [
      [150, 30],
      [156, 22],
      [162, 38],
      [168, 22],
      [174, 38],
      [180, 30],
    ],
    "",
  );
  const body = [
    source(40, 70, 20, "Vs", ""),
    line(40, 50, 40, 30),
    line(40, 90, 40, 110),
    resistorH(70, 30, 70, `R=${fmt(R)}`),
    reactor,
    text(165, 16, `X=${fmt(X)}`, TC),
    line(180, 30, 215, 30),
    rect(215, 35, 35, 60, 'fill="none"'),
    text(232, 60, "負荷", TC),
    text(232, 84, `cosθ=${fmt(cos)}`, TC),
    line(215, 95, 215, 110),
    line(215, 110, 40, 110),
    line(250, 30, 250, 35),
    line(250, 95, 250, 110),
    line(250, 110, 215, 110),
    text(150, 130, `I=${fmt(I)}A → v=2I(Rcosθ+Xsinθ)`, TC),
  ].join("");
  return svg({ width: 290, height: 144, title: `単相2線式線路 I=${fmt(I)}A、R=${fmt(R)}Ω、X=${fmt(X)}Ω` }, body);
}

/** 変圧器（一次/二次コイル＋鉄心）。 */
export function transformerFigure(V1: number, V2: number, a: number): string {
  const coil = (x: number): string =>
    [0, 1, 2, 3].map((i) => `<path d="M ${x} ${42 + i * 14} a 7 7 0 0 1 0 14" fill="none"/>`).join("");
  const body = [
    line(45, 42, 45, 35),
    line(45, 35, 75, 35),
    line(75, 35, 75, 42),
    coil(75),
    line(75, 98, 75, 105),
    line(75, 105, 45, 105),
    line(45, 105, 45, 98),
    text(33, 74, "V1"),
    text(20, 90, `${fmt(V1)}`),
    line(108, 35, 108, 110, 'stroke-width="3"'),
    line(116, 35, 116, 110, 'stroke-width="3"'),
    coil(150),
    line(150, 35, 185, 35),
    line(185, 35, 185, 42),
    line(150, 98, 185, 98),
    line(185, 98, 185, 105),
    text(192, 74, "V2"),
    text(192, 90, `${fmt(V2)}`),
    text(112, 134, `巻数比 a=V1/V2=${fmt(a)}`, TC),
  ].join("");
  return svg({ width: 240, height: 146, title: `変圧器 一次${fmt(V1)}V/二次${fmt(V2)}V、巻数比a=${fmt(a)}` }, body);
}

/** 同期発電機のベクトル図（V, E, 負荷角δ, jI·Xs）。 */
export function syncPhasorFigure(V: number, E: number, deg: number): string {
  const ox = 50;
  const oy = 120;
  const rad = (deg * Math.PI) / 180;
  const scale = 110 / Math.max(V, E, 1);
  const vx = ox + V * scale;
  const ex = ox + E * scale * Math.cos(rad);
  const ey = oy - E * scale * Math.sin(rad);
  const arcEnd = [ox + 34 * Math.cos(rad), oy - 34 * Math.sin(rad)];
  const body = [
    arrow(ox, oy, vx, oy, `V=${fmt(V)}`),
    arrow(ox, oy, ex, ey, `E=${fmt(E)}`),
    line(vx, oy, ex, ey, 'stroke-dasharray="4 3"'),
    text((vx + ex) / 2 + 6, (oy + ey) / 2, "jIXs"),
    `<path d="M ${ox + 34} ${oy} A 34 34 0 0 0 ${arcEnd[0]?.toFixed(1)} ${arcEnd[1]?.toFixed(1)}" fill="none" stroke-dasharray="3 2"/>`,
    text(ox + 42, oy - 12, `δ=${fmt(deg)}°`),
    text(ox, oy + 22, "P=3VEsinδ/Xs"),
  ].join("");
  return svg(
    { width: 250, height: 150, title: `同期発電機ベクトル図 V=${fmt(V)}V、E=${fmt(E)}V、負荷角δ=${fmt(deg)}°` },
    body,
  );
}

/** 一次遅れ系のブロック線図 K/(1+Ts)。 */
export function firstOrderBlockFigure(K: number, T: number): string {
  const body = [
    arrow(20, 60, 80, 60, ""),
    text(50, 50, "A", TC),
    rect(80, 38, 120, 44, 'fill="none"'),
    text(140, 66, "K/(1+Ts)", TC),
    text(140, 30, `K=${fmt(K)}, T=${fmt(T)}s`, TC),
    arrow(200, 60, 268, 60, ""),
    text(236, 50, "y(∞)=KA", TC),
  ].join("");
  return svg(
    { width: 290, height: 100, title: `一次遅れ系ブロック線図 G(s)=K/(1+Ts)、K=${fmt(K)}、T=${fmt(T)}s` },
    body,
  );
}

/** トルク-滑り特性（比例推移: 二次抵抗増で最大トルクの滑りが s1→s2 へ移動）。 */
export function torqueSlipFigure(s1: number, s2: number): string {
  const ox = 45;
  const oy = 130;
  const w = 220;
  const h = 100;
  const px1 = Math.min(ox + w - 20, ox + s1 * w * 4 + 30);
  const px2 = Math.min(ox + w - 5, ox + s2 * w * 4 + 30);
  const curve = (cx: number, dash: boolean): string =>
    `<path d="M ${ox} ${oy} Q ${cx} ${oy - h - 18} ${ox + w} ${oy - 16}" fill="none"${dash ? ' stroke-dasharray="5 3"' : ""}/>`;
  const body = [
    arrow(ox, oy, ox + w + 12, oy, ""),
    arrow(ox, oy, ox, oy - h - 24, ""),
    text(ox + w - 20, oy + 18, "滑り s"),
    text(ox + 4, oy - h - 18, "トルク T"),
    curve(px1, false),
    curve(px2, true),
    verticalTick(px1, oy, oy - h + 10, `s1=${fmt(s1)}`, TC),
    verticalTick(px2, oy, oy - h + 30, `s2=${fmt(s2)}`, TC),
    text(ox + 95, oy - h - 6, "r2増 → 右へ推移"),
  ].join("");
  return svg(
    { width: 290, height: 162, title: `誘導電動機の比例推移 トルク-滑り曲線が s1=${fmt(s1)}→s2=${fmt(s2)} へ移動` },
    body,
  );
}

/** 直並列抵抗（R1 直列 + R2∥R3）。 */
export function resistorLadderFigure(R1: number, R2: number, R3: number): string {
  const body = [
    source(40, 70, 20, "V", ""),
    line(40, 50, 40, 30),
    line(40, 90, 40, 110),
    resistorH(70, 30, 65, `R1=${fmt(R1)}`),
    line(135, 30, 175, 30),
    dot(175, 30),
    resistorV(175, 40, 60, `R2=${fmt(R2)}`),
    line(175, 30, 235, 30),
    resistorV(235, 40, 60, `R3=${fmt(R3)}`),
    dot(175, 100),
    line(175, 100, 235, 100),
    line(175, 100, 40, 110),
    line(40, 110, 40, 110),
    line(175, 100, 175, 110),
    line(235, 100, 235, 30),
    text(110, 132, "合成 R=R1+(R2∥R3)", TC),
  ].join("");
  return svg(
    { width: 290, height: 144, title: `直並列抵抗 R1=${fmt(R1)}Ω 直列 + R2=${fmt(R2)}Ω∥R3=${fmt(R3)}Ω` },
    body,
  );
}
