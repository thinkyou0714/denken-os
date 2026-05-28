/**
 * 電験スタイルの回路図 SVG を量産するためのプリミティブ群(v2)。
 *
 * 設計原則(本ファイルの v1 で出た「文字が図と被る/字体が弱い」問題を解決):
 *  - 全テキストに **白ハロー** を付与(paint-order: stroke fill, stroke=#fff 幅 3px)
 *    → 線と重なっても確実に読める
 *  - 既定 font-weight 600〜700(弱い字体禁止)
 *  - 既定 font-size 14px 以上
 *  - 抵抗器ラベルは必ず box の外側 6px 以上のクリアランス
 *  - 構成要素・線・ラベル全てを純黒近く #0f172a で統一(線幅 2px)
 *  - 電流/電圧ベクトルは青(#1d4ed8) 太字斜体
 *  - 説明アノテーション(一次銅損 等)は青太字
 *  - 角度は赤(#dc2626)
 *
 * 各関数は SVG 要素文字列を返す純関数。`svg()` で連結し、Problem.figureSvg に格納する。
 */

const STROKE = "#0f172a";
const BLUE = "#1d4ed8";
const RED = "#dc2626";
const HALO = "#ffffff";
const FONT =
  "ui-sans-serif, system-ui, -apple-system, 'Hiragino Sans', 'Yu Gothic UI', sans-serif";

/** 白ハロー付きテキスト。線の上でも確実に読める。 */
function textHalo(
  x: number,
  y: number,
  content: string,
  opts: {
    size?: number;
    weight?: number | string;
    color?: string;
    anchor?: "start" | "middle" | "end";
    italic?: boolean;
  } = {},
): string {
  const size = opts.size ?? 14;
  const weight = opts.weight ?? 600;
  const color = opts.color ?? "#111";
  const anchor = opts.anchor ?? "middle";
  const italic = opts.italic ? ` font-style="italic"` : "";
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${italic} paint-order="stroke fill" stroke="${HALO}" stroke-width="3" stroke-linejoin="round">${content}</text>`;
}

/** SVG ルート要素を組み立てる。content は子要素の文字列の可変長引数。 */
export function svg(
  width: number,
  height: number,
  title: string,
  ...content: string[]
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t" style="max-width:100%;height:auto"><title id="t">${title}</title><defs><marker id="ah" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L9,3 L0,6 z" fill="${STROKE}"/></marker><marker id="ahb" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L9,3 L0,6 z" fill="${BLUE}"/></marker></defs>${content.join("")}</svg>`;
}

/** 折れ線。任意数の (x,y) 頂点を順に結ぶ。線幅 2px 統一。 */
export function wire(...points: Array<[number, number]>): string {
  const pts = points.map(([x, y]) => `${x},${y}`).join(" ");
  return `<polyline points="${pts}" fill="none" stroke="${STROKE}" stroke-width="2" stroke-linecap="square"/>`;
}

/** 分岐ノード(塗りつぶし円・直径 7px)。 */
export function node(x: number, y: number): string {
  return `<circle cx="${x}" cy="${y}" r="3.5" fill="${STROKE}"/>`;
}

/**
 * 抵抗器(IEC 矩形)。中心 (x,y) に配置。
 * ラベルは box の外 6px の位置に白ハロー付きで描画(線/wire と被っても読める)。
 */
export function resistor(
  x: number,
  y: number,
  label: string,
  opts: {
    vertical?: boolean;
    w?: number;
    h?: number;
    /** "above"(既定) / "below" / "right" / "left" */
    labelPos?: "above" | "below" | "right" | "left";
  } = {},
): string {
  const w = opts.w ?? 64;
  const h = opts.h ?? 22;
  const pos = opts.labelPos ?? "above";
  if (opts.vertical) {
    const rect = `<rect x="${x - h / 2}" y="${y - w / 2}" width="${h}" height="${w}" fill="#fff" stroke="${STROKE}" stroke-width="2"/>`;
    const lx = pos === "left" ? x - h / 2 - 6 : x + h / 2 + 6;
    const lAnchor: "start" | "end" = pos === "left" ? "end" : "start";
    return `<g>${rect}${textHalo(lx, y + 5, label, { anchor: lAnchor, weight: 700 })}</g>`;
  }
  const rect = `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="#fff" stroke="${STROKE}" stroke-width="2"/>`;
  let lx = x;
  let ly = y;
  let anchor: "start" | "middle" | "end" = "middle";
  if (pos === "above") {
    ly = y - h / 2 - 7;
  } else if (pos === "below") {
    ly = y + h / 2 + 16;
  } else if (pos === "right") {
    lx = x + w / 2 + 8;
    ly = y + 5;
    anchor = "start";
  } else {
    lx = x - w / 2 - 8;
    ly = y + 5;
    anchor = "end";
  }
  return `<g>${rect}${textHalo(lx, ly, label, { anchor, weight: 700 })}</g>`;
}

/**
 * インダクタ(コイル)を 3 つの半円で表現。中心 (x,y) の左右 30px 範囲。
 */
export function inductor(
  x: number,
  y: number,
  label: string,
  opts: { vertical?: boolean; labelPos?: "above" | "below" | "right" | "left" } = {},
): string {
  const pos = opts.labelPos ?? "below";
  if (opts.vertical) {
    const path = `M ${x} ${y - 30} a 10 10 0 0 0 0 20 a 10 10 0 0 0 0 20 a 10 10 0 0 0 0 20`;
    const lx = pos === "left" ? x - 14 : x + 14;
    const a: "start" | "end" = pos === "left" ? "end" : "start";
    return `<g><path d="${path}" fill="none" stroke="${STROKE}" stroke-width="2"/>${textHalo(lx, y + 5, label, { anchor: a, weight: 700 })}</g>`;
  }
  const path = `M ${x - 30} ${y} a 10 10 0 0 1 20 0 a 10 10 0 0 1 20 0 a 10 10 0 0 1 20 0`;
  const ly = pos === "above" ? y - 16 : y + 26;
  return `<g><path d="${path}" fill="none" stroke="${STROKE}" stroke-width="2"/>${textHalo(x, ly, label, { weight: 700 })}</g>`;
}

/** キャパシタ(平行 2 線)。中心 (x,y)。 */
export function capacitor(
  x: number,
  y: number,
  label: string,
  opts: { vertical?: boolean } = {},
): string {
  if (opts.vertical) {
    return `<g><line x1="${x - 14}" y1="${y - 3}" x2="${x + 14}" y2="${y - 3}" stroke="${STROKE}" stroke-width="2.5"/><line x1="${x - 14}" y1="${y + 3}" x2="${x + 14}" y2="${y + 3}" stroke="${STROKE}" stroke-width="2.5"/>${textHalo(x + 22, y + 5, label, { anchor: "start", weight: 700 })}</g>`;
  }
  return `<g><line x1="${x - 3}" y1="${y - 14}" x2="${x - 3}" y2="${y + 14}" stroke="${STROKE}" stroke-width="2.5"/><line x1="${x + 3}" y1="${y - 14}" x2="${x + 3}" y2="${y + 14}" stroke="${STROKE}" stroke-width="2.5"/>${textHalo(x, y + 28, label, { weight: 700 })}</g>`;
}

/** 円形シンボル(電源 E / 検流計 G 等)。中心 (x,y)、ラベルは円内中央。 */
export function circleSymbol(
  x: number,
  y: number,
  text: string,
  opts: { r?: number; color?: string } = {},
): string {
  const r = opts.r ?? 14;
  const color = opts.color ?? BLUE;
  return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${STROKE}" stroke-width="2"/>${textHalo(x, y + 5, text, { weight: 800, color })}</g>`;
}

/** 端子(小さい白塗り黒枠の円・⌀8px)。配線の入口/出口に。 */
export function terminal(x: number, y: number): string {
  return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${STROKE}" stroke-width="2"/>`;
}

/** 直流電池(長短線対)。横向き既定。中心 (x,y)。 */
export function battery(x: number, y: number, label: string): string {
  return `<g><line x1="${x - 3}" y1="${y - 14}" x2="${x - 3}" y2="${y + 14}" stroke="${STROKE}" stroke-width="3"/><line x1="${x + 3}" y1="${y - 8}" x2="${x + 3}" y2="${y + 8}" stroke="${STROKE}" stroke-width="2"/>${textHalo(x - 16, y + 5, label, { anchor: "end", color: BLUE, weight: 800, italic: true, size: 15 })}</g>`;
}

/**
 * 電流方向矢印 + ラベル。
 * 矢頭は黒の二等辺三角、ラベルは青太字斜体(上線付き Ī, V̄ 等)。
 * 白ハロー付きで線の上でも読める。
 */
export function currentArrow(
  x: number,
  y: number,
  label: string,
  opts: { dir?: "right" | "left" | "up" | "down"; labelDy?: number } = {},
): string {
  const dir = opts.dir ?? "right";
  let head = "";
  if (dir === "right") head = `M ${x - 4} ${y - 5} L ${x + 6} ${y} L ${x - 4} ${y + 5} Z`;
  else if (dir === "left") head = `M ${x + 4} ${y - 5} L ${x - 6} ${y} L ${x + 4} ${y + 5} Z`;
  else if (dir === "up") head = `M ${x - 5} ${y + 4} L ${x} ${y - 6} L ${x + 5} ${y + 4} Z`;
  else head = `M ${x - 5} ${y - 4} L ${x} ${y + 6} L ${x + 5} ${y - 4} Z`;
  const dy = opts.labelDy ?? (dir === "right" || dir === "left" ? -12 : 4);
  const lx = dir === "up" || dir === "down" ? x + 14 : x;
  const ly = y + dy;
  const a: "start" | "middle" = dir === "up" || dir === "down" ? "start" : "middle";
  return `<g><path d="${head}" fill="${BLUE}" stroke="${BLUE}" stroke-width="1"/>${textHalo(lx, ly, label, { anchor: a, color: BLUE, weight: 800, italic: true, size: 15 })}</g>`;
}

/** 青の説明アノテーション(一次銅損, 鉄損 等)。太字。 */
export function annotation(
  x: number,
  y: number,
  text: string,
  opts: { anchor?: "start" | "middle" | "end"; size?: number } = {},
): string {
  return textHalo(x, y, text, {
    color: BLUE,
    weight: 800,
    size: opts.size ?? 14,
    anchor: opts.anchor ?? "middle",
  });
}

/** 一般の黒ラベル。 */
export function label(
  x: number,
  y: number,
  text: string,
  opts: {
    anchor?: "start" | "middle" | "end";
    size?: number;
    color?: string;
    italic?: boolean;
    weight?: number | string;
  } = {},
): string {
  return textHalo(x, y, text, {
    anchor: opts.anchor ?? "middle",
    size: opts.size ?? 14,
    color: opts.color ?? "#111",
    italic: opts.italic,
    weight: opts.weight ?? 700,
  });
}

/** 図キャプション("図 N")。SVG 下端中央。 */
export function caption(viewBoxWidth: number, viewBoxHeight: number, text: string): string {
  return textHalo(viewBoxWidth / 2, viewBoxHeight - 8, text, {
    color: "#475569",
    weight: 600,
    size: 13,
  });
}

/** 直角マーカ(三角形の直角部分の小さなコーナー記号)。 */
export function rightAngle(
  x: number,
  y: number,
  opts: { size?: number; orientation?: "tl" | "tr" | "bl" | "br" } = {},
): string {
  const s = opts.size ?? 10;
  const o = opts.orientation ?? "br";
  let pts: string;
  if (o === "br") pts = `${x - s},${y} ${x - s},${y - s} ${x},${y - s}`;
  else if (o === "bl") pts = `${x + s},${y} ${x + s},${y - s} ${x},${y - s}`;
  else if (o === "tr") pts = `${x - s},${y} ${x - s},${y + s} ${x},${y + s}`;
  else pts = `${x + s},${y} ${x + s},${y + s} ${x},${y + s}`;
  return `<polyline points="${pts}" fill="none" stroke="${STROKE}" stroke-width="2"/>`;
}

/** 角度 θ の小円弧 + 赤色ラベル(ベクトル三角形用)。 */
export function arcAngle(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  labelText: string,
  opts: { labelDx?: number; labelDy?: number } = {},
): string {
  const dx = opts.labelDx ?? 16;
  const dy = opts.labelDy ?? -2;
  const sx = cx + r * Math.cos((startDeg * Math.PI) / 180);
  const sy = cy + r * Math.sin((startDeg * Math.PI) / 180);
  const ex = cx + r * Math.cos((endDeg * Math.PI) / 180);
  const ey = cy + r * Math.sin((endDeg * Math.PI) / 180);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const path = `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${r} ${r} 0 ${large} 0 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  return `<g><path d="${path}" fill="none" stroke="${STROKE}" stroke-width="2"/>${textHalo(cx + dx, cy + dy, labelText, { color: RED, weight: 800, size: 16 })}</g>`;
}

/** 矢印付き線(ベクトル合成等)。色指定可。 */
export function arrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opts: { color?: "black" | "blue"; dashed?: boolean } = {},
): string {
  const isBlue = opts.color === "blue";
  const stroke = isBlue ? BLUE : STROKE;
  const marker = isBlue ? "ahb" : "ah";
  const dash = opts.dashed ? ` stroke-dasharray="4 3"` : "";
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2.5" marker-end="url(#${marker})"${dash}/>`;
}
