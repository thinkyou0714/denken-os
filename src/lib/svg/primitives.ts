/**
 * 電験スタイルの回路図 SVG を量産するためのプリミティブ群。
 * 各関数は **SVG 要素文字列** を返す純関数。`svg()` で連結し、コミット時の文字列として
 * Problem.figureSvg に格納する。実行時は dangerouslySetInnerHTML で挿入される。
 *
 * 凡例:
 * - 黒(#0f172a): 回路の主線、コンポーネント
 * - 青(#1d4ed8): 電流・電圧の "ベクトル量"、説明アノテーション(一次銅損 等)
 * - 赤(#dc2626): 角度 θ など特殊な強調
 * - グレー(#475569): キャプション、ノード補助ラベル
 */

const STROKE = "#0f172a";
const BLUE = "#1d4ed8";

/** SVG ルート要素を組み立てる。content は子要素の文字列の可変長引数。 */
export function svg(
  width: number,
  height: number,
  title: string,
  ...content: string[]
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t" style="max-width:100%;height:auto"><title id="t">${title}</title><style>.lbl{font-family:ui-sans-serif,system-ui,"Hiragino Sans","Yu Gothic UI",sans-serif;}</style>${content.join("")}</svg>`;
}

/** 直線/折れ線。任意数の (x,y) 頂点を順に結ぶ。 */
export function wire(...points: Array<[number, number]>): string {
  const pts = points.map(([x, y]) => `${x},${y}`).join(" ");
  return `<polyline points="${pts}" fill="none" stroke="${STROKE}" stroke-width="2"/>`;
}

/** 分岐ノード(塗りつぶし円)。 */
export function node(x: number, y: number): string {
  return `<circle cx="${x}" cy="${y}" r="3" fill="${STROKE}"/>`;
}

/** 抵抗器(IEC 矩形)。水平既定。中心 (x,y) に配置し、両端は水平に出る。 */
export function resistor(
  x: number,
  y: number,
  label: string,
  opts: { vertical?: boolean; w?: number; h?: number; labelOffset?: number } = {},
): string {
  const w = opts.w ?? 60;
  const h = opts.h ?? 22;
  const off = opts.labelOffset ?? 14;
  if (opts.vertical) {
    const rx = x - h / 2;
    const ry = y - w / 2;
    return `<g><rect x="${rx}" y="${ry}" width="${h}" height="${w}" fill="#fff" stroke="${STROKE}" stroke-width="2"/><text class="lbl" x="${x + h / 2 + 6}" y="${y + 4}" font-size="13" fill="#111">${label}</text></g>`;
  }
  const rx = x - w / 2;
  const ry = y - h / 2;
  return `<g><rect x="${rx}" y="${ry}" width="${w}" height="${h}" fill="#fff" stroke="${STROKE}" stroke-width="2"/><text class="lbl" x="${x}" y="${y - h / 2 - off + 14}" text-anchor="middle" font-size="13" fill="#111">${label}</text></g>`;
}

/** 抵抗器(ラベルを矩形の内側に配置するバリエーション)。値を中に書きたいときに。 */
export function resistorBoxed(
  x: number,
  y: number,
  label: string,
  opts: { w?: number; h?: number } = {},
): string {
  const w = opts.w ?? 80;
  const h = opts.h ?? 30;
  return `<g><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="#fff" stroke="${STROKE}" stroke-width="2"/><text class="lbl" x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" fill="#111">${label}</text></g>`;
}

/**
 * インダクタ(コイル)を 3 つの半円で表現。水平既定。
 * 中心 (x,y) を基準に幅 60 で描く。
 */
export function inductor(
  x: number,
  y: number,
  label: string,
  opts: { vertical?: boolean; labelOffset?: number } = {},
): string {
  const off = opts.labelOffset ?? 22;
  if (opts.vertical) {
    // 縦コイル: 中心(x,y) を中心とした 3 つの半円を上下に積む(全長60)
    const path = `M ${x} ${y - 30} a 10 10 0 0 0 0 20 a 10 10 0 0 0 0 20 a 10 10 0 0 0 0 20`;
    return `<g><path d="${path}" fill="none" stroke="${STROKE}" stroke-width="2"/><text class="lbl" x="${x + 14}" y="${y + 5}" font-size="13" fill="#111">${label}</text></g>`;
  }
  // 横コイル: 中心(x,y) を中心とした 3 つの半円を左右に並べる(全長60)
  const path = `M ${x - 30} ${y} a 10 10 0 0 1 20 0 a 10 10 0 0 1 20 0 a 10 10 0 0 1 20 0`;
  return `<g><path d="${path}" fill="none" stroke="${STROKE}" stroke-width="2"/><text class="lbl" x="${x}" y="${y + off}" text-anchor="middle" font-size="13" fill="#111">${label}</text></g>`;
}

/** キャパシタ(平行2本線)。水平既定。中心 (x,y)。 */
export function capacitor(
  x: number,
  y: number,
  label: string,
  opts: { vertical?: boolean } = {},
): string {
  if (opts.vertical) {
    return `<g><line x1="${x - 14}" y1="${y - 3}" x2="${x + 14}" y2="${y - 3}" stroke="${STROKE}" stroke-width="2.5"/><line x1="${x - 14}" y1="${y + 3}" x2="${x + 14}" y2="${y + 3}" stroke="${STROKE}" stroke-width="2.5"/><text class="lbl" x="${x + 20}" y="${y + 5}" font-size="13" fill="#111">${label}</text></g>`;
  }
  return `<g><line x1="${x - 3}" y1="${y - 14}" x2="${x - 3}" y2="${y + 14}" stroke="${STROKE}" stroke-width="2.5"/><line x1="${x + 3}" y1="${y - 14}" x2="${x + 3}" y2="${y + 14}" stroke="${STROKE}" stroke-width="2.5"/><text class="lbl" x="${x}" y="${y + 28}" text-anchor="middle" font-size="13" fill="#111">${label}</text></g>`;
}

/**
 * 電圧/電源端子(左側に縦並びの "○ ○" 端子で表す。実用回路図の左端のソース部)。
 * 中心 (x,y) を上端子と下端子の中点とする。tall でソース部の高さを指定。
 */
export function sourceTerminals(
  x: number,
  y: number,
  label: string,
  opts: { tall?: number } = {},
): string {
  const tall = opts.tall ?? 100;
  const top = y - tall / 2;
  const bot = y + tall / 2;
  return `<g><circle cx="${x}" cy="${top}" r="4" fill="#fff" stroke="${STROKE}" stroke-width="2"/><circle cx="${x}" cy="${bot}" r="4" fill="#fff" stroke="${STROKE}" stroke-width="2"/><text class="lbl" x="${x - 14}" y="${y + 5}" text-anchor="end" font-size="14" fill="${BLUE}" font-weight="600" font-style="italic">${label}</text></g>`;
}

/** 直流電源(電池記号)。中心 (x,y)。横向きに配置(短/長線が縦)。 */
export function battery(x: number, y: number, label: string): string {
  return `<g><line x1="${x - 3}" y1="${y - 14}" x2="${x - 3}" y2="${y + 14}" stroke="${STROKE}" stroke-width="3"/><line x1="${x + 3}" y1="${y - 8}" x2="${x + 3}" y2="${y + 8}" stroke="${STROKE}" stroke-width="2"/><text class="lbl" x="${x - 14}" y="${y + 5}" text-anchor="end" font-size="14" fill="${BLUE}" font-weight="600" font-style="italic">${label}</text></g>`;
}

/**
 * 電流方向矢印 + ラベル(青のドット付き斜体風文字)。
 * 配置位置 (x,y) はワイヤ上の中央。dir で方向、labelDy でラベルの上下オフセット。
 */
export function currentArrow(
  x: number,
  y: number,
  label: string,
  opts: { dir?: "right" | "left" | "up" | "down"; labelDy?: number } = {},
): string {
  const dir = opts.dir ?? "right";
  const dy = opts.labelDy ?? -10;
  let head = "";
  if (dir === "right") head = `M ${x - 6} ${y - 5} L ${x + 6} ${y} L ${x - 6} ${y + 5} Z`;
  else if (dir === "left") head = `M ${x + 6} ${y - 5} L ${x - 6} ${y} L ${x + 6} ${y + 5} Z`;
  else if (dir === "up") head = `M ${x - 5} ${y + 6} L ${x} ${y - 6} L ${x + 5} ${y + 6} Z`;
  else head = `M ${x - 5} ${y - 6} L ${x} ${y + 6} L ${x + 5} ${y - 6} Z`;
  const lx = dir === "up" || dir === "down" ? x + 12 : x;
  const ly = dir === "up" || dir === "down" ? y + 4 : y + dy;
  const anchor = dir === "up" || dir === "down" ? "start" : "middle";
  return `<g><path d="${head}" fill="${BLUE}"/><text class="lbl" x="${lx}" y="${ly}" text-anchor="${anchor}" font-size="14" fill="${BLUE}" font-weight="600" font-style="italic">${label}</text></g>`;
}

/** 青の説明ラベル(一次銅損, 鉄損 等)。 */
export function annotation(
  x: number,
  y: number,
  text: string,
  opts: { anchor?: "start" | "middle" | "end" } = {},
): string {
  const anchor = opts.anchor ?? "middle";
  return `<text class="lbl" x="${x}" y="${y}" text-anchor="${anchor}" font-size="13" font-weight="600" fill="${BLUE}">${text}</text>`;
}

/** 一般の黒ラベル。 */
export function label(
  x: number,
  y: number,
  text: string,
  opts: { anchor?: "start" | "middle" | "end"; size?: number; color?: string; italic?: boolean } = {},
): string {
  const anchor = opts.anchor ?? "middle";
  const size = opts.size ?? 13;
  const color = opts.color ?? "#111";
  const style = opts.italic ? ' font-style="italic"' : "";
  return `<text class="lbl" x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${color}"${style}>${text}</text>`;
}

/** 図キャプション("図 N")。SVG 内の下端中央に配置。 */
export function caption(viewBoxWidth: number, viewBoxHeight: number, text: string): string {
  return `<text class="lbl" x="${viewBoxWidth / 2}" y="${viewBoxHeight - 6}" text-anchor="middle" font-size="13" fill="#475569">${text}</text>`;
}

/** 直角マーカー(三角形の直角に置く小さなコーナー)。 */
export function rightAngle(
  x: number,
  y: number,
  opts: { size?: number; orientation?: "tl" | "tr" | "bl" | "br" } = {},
): string {
  const s = opts.size ?? 10;
  const o = opts.orientation ?? "br";
  // 直角の頂点 (x,y) から 2 本の短線を「直角を示す向き」に伸ばす
  let pts: string;
  if (o === "br") pts = `${x - s},${y} ${x - s},${y - s} ${x},${y - s}`;
  else if (o === "bl") pts = `${x + s},${y} ${x + s},${y - s} ${x},${y - s}`;
  else if (o === "tr") pts = `${x - s},${y} ${x - s},${y + s} ${x},${y + s}`;
  else pts = `${x + s},${y} ${x + s},${y + s} ${x},${y + s}`;
  return `<polyline points="${pts}" fill="none" stroke="${STROKE}" stroke-width="2"/>`;
}

/** 角度 θ の小円弧(ベクトル三角形用)。中心 (cx,cy)、半径 r、開始角〜終了角(度)。 */
export function arcAngle(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  labelText: string,
  opts: { labelDx?: number; labelDy?: number } = {},
): string {
  const dx = opts.labelDx ?? 14;
  const dy = opts.labelDy ?? -2;
  const sx = cx + r * Math.cos((startDeg * Math.PI) / 180);
  const sy = cy + r * Math.sin((startDeg * Math.PI) / 180);
  const ex = cx + r * Math.cos((endDeg * Math.PI) / 180);
  const ey = cy + r * Math.sin((endDeg * Math.PI) / 180);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const path = `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${r} ${r} 0 ${large} 0 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  return `<g><path d="${path}" fill="none" stroke="${STROKE}" stroke-width="2"/><text class="lbl" x="${cx + dx}" y="${cy + dy}" font-size="14" font-weight="700" fill="#dc2626">${labelText}</text></g>`;
}
