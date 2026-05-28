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

/** インライン SVG の ID 衝突回避用シーケンス(同一ページに複数の SVG があっても安全)。 */
let svgIdSeq = 0;
function nextNs(): string {
  svgIdSeq += 1;
  return `s${svgIdSeq.toString(36)}`;
}

/**
 * SVG ルート要素。
 * - role + aria-labelledby + aria-describedby で screen reader 対応
 * - <title> に短い意図、<desc> に詳細説明
 * - ID は name space で衝突回避 (項目 95)
 */
export function svg(
  width: number,
  height: number,
  title: string,
  ...content: string[]
): string {
  const ns = nextNs();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${ns}t" aria-describedby="${ns}d" style="max-width:100%;height:auto"><title id="${ns}t">${title}</title><desc id="${ns}d">${title}の回路図(DNKN-OS 学習教材)</desc><defs><marker id="${ns}ah" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L9,3 L0,6 z" fill="${STROKE}"/></marker><marker id="${ns}ahb" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L9,3 L0,6 z" fill="${BLUE}"/></marker></defs>${content.join("").replaceAll("url(#ah)", `url(#${ns}ah)`).replaceAll("url(#ahb)", `url(#${ns}ahb)`)}</svg>`;
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

/**
 * 接地(アース)記号。JIS C 0617 準拠。
 * 3 段の水平短線が下に向かって短くなる。
 * (x,y) は接続点(垂直配線の終端)。
 */
export function ground(x: number, y: number): string {
  return `<g><line x1="${x - 14}" y1="${y}" x2="${x + 14}" y2="${y}" stroke="${STROKE}" stroke-width="2.5"/><line x1="${x - 9}" y1="${y + 5}" x2="${x + 9}" y2="${y + 5}" stroke="${STROKE}" stroke-width="2"/><line x1="${x - 4}" y1="${y + 10}" x2="${x + 4}" y2="${y + 10}" stroke="${STROKE}" stroke-width="2"/></g>`;
}

/**
 * 半円ジャンパ(交差非接続)。
 * 水平線が垂直線をまたぐとき、水平線が垂直線の上を半円アーチで越える。
 * (x,y) は交差中心、`bridge` で線の向きを指定。
 */
export function crossover(
  x: number,
  y: number,
  opts: { bridge?: "horizontal" | "vertical"; r?: number } = {},
): string {
  const r = opts.r ?? 7;
  const dir = opts.bridge ?? "horizontal";
  if (dir === "horizontal") {
    return `<path d="M ${x - r} ${y} A ${r} ${r} 0 0 1 ${x + r} ${y}" fill="none" stroke="${STROKE}" stroke-width="2"/>`;
  }
  return `<path d="M ${x} ${y - r} A ${r} ${r} 0 0 1 ${x} ${y + r}" fill="none" stroke="${STROKE}" stroke-width="2"/>`;
}

/**
 * AC 電源(円内に正弦波シンボル)。JIS C 0617 準拠。
 * (x,y) は円の中心。
 */
export function acSource(x: number, y: number, label: string): string {
  const wave = `<path d="M ${x - 8} ${y} q 4 -7 8 0 q 4 7 8 0" fill="none" stroke="${STROKE}" stroke-width="1.8"/>`;
  return `<g><circle cx="${x}" cy="${y}" r="16" fill="#fff" stroke="${STROKE}" stroke-width="2"/>${wave}${textHalo(x - 22, y + 5, label, { anchor: "end", color: BLUE, weight: 800, italic: true, size: 15 })}</g>`;
}

/** 電圧ベクトル/降下を示す両端三角矢印。+極性側の終点に "+", -側に "-"。 */
export function voltageArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  opts: { color?: "black" | "blue" } = {},
): string {
  const isBlue = opts.color !== "black";
  const c = isBlue ? BLUE : STROKE;
  const marker = isBlue ? "ahb" : "ah";
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  // 線の方向に対して垂直方向へ12pxずらしてラベル
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const lx = midX + nx * 14;
  const ly = midY + ny * 14;
  return `<g><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2" marker-end="url(#${marker})"/>${textHalo(lx, ly + 5, label, { color: c, weight: 800, italic: true, size: 14 })}</g>`;
}

/** 補助線(寸法線・基準線)。破線で薄めの黒。 */
export function dashedWire(...points: Array<[number, number]>): string {
  const pts = points.map(([x, y]) => `${x},${y}`).join(" ");
  return `<polyline points="${pts}" fill="none" stroke="${STROKE}" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"/>`;
}

/**
 * 寸法線(2点間の距離を矢印つき線で表示)。
 * 機械系問題で寸法表示が必要なとき。
 */
export function dimension(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return `<g><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${STROKE}" stroke-width="1.5" marker-start="url(#ah)" marker-end="url(#ah)"/>${textHalo((x1 + x2) / 2 + nx * 10, (y1 + y2) / 2 + ny * 10 + 5, label, { weight: 700, size: 13 })}</g>`;
}

/** 未知量(?マーク)を黄色で囲んで強調。教育的注意喚起。 */
export function unknownHighlight(
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2" rx="4"/>`;
}
