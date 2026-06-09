/**
 * svg.ts — 図(回路図・ベクトル図・ブロック図)を描くためのインライン SVG プリミティブ。
 *
 * 設計方針:
 *  - オフライン/最小依存を堅持するため外部ライブラリは使わず、文字列で SVG を組み立てる。
 *  - 配色はテーマ追従(`currentColor`)。線=stroke / 文字=fill を使い分ける。
 *  - アクセシビリティ: ルートに role="img" と <title>/<desc> を必ず付ける。
 *  - ラベルは esc() で必ずエスケープ（数値・記号のみだが安全側）。
 */

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

export function line(x1: number, y1: number, x2: number, y2: number, attrs = ""): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${attrs ? ` ${attrs}` : ""}/>`;
}

export function polyline(points: ReadonlyArray<readonly [number, number]>, attrs = ""): string {
  const pts = points.map(([x, y]) => `${x},${y}`).join(" ");
  return `<polyline points="${pts}"${attrs ? ` ${attrs}` : ""}/>`;
}

export function rect(x: number, y: number, w: number, h: number, attrs = ""): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${attrs ? ` ${attrs}` : ""}/>`;
}

export function circle(cx: number, cy: number, r: number, attrs = ""): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}"${attrs ? ` ${attrs}` : ""}/>`;
}

/** 接続点（黒丸）。 */
export function dot(cx: number, cy: number): string {
  return circle(cx, cy, 3.2, 'fill="currentColor" stroke="none"');
}

/** テキストラベル（既定は塗りつぶし＝文字、線なし）。 */
export function text(x: number, y: number, s: string, attrs = ""): string {
  return `<text x="${x}" y="${y}" fill="currentColor" stroke="none"${attrs ? ` ${attrs}` : ""}>${esc(s)}</text>`;
}

/** 水平方向の抵抗器（IEC 箱型）。中央に label を置ける。x→x+len の配線に挿入する。 */
export function resistorH(x: number, y: number, len: number, label?: string): string {
  const boxW = Math.min(40, len * 0.55);
  const x0 = x + (len - boxW) / 2;
  const parts = [line(x, y, x0, y), rect(x0, y - 9, boxW, 18, 'fill="none"'), line(x0 + boxW, y, x + len, y)];
  if (label) parts.push(text(x + len / 2, y - 14, label, 'text-anchor="middle"'));
  return parts.join("");
}

/** 垂直方向の抵抗器（上→下）。右側に label。 */
export function resistorV(x: number, y: number, len: number, label?: string): string {
  const boxH = Math.min(40, len * 0.55);
  const y0 = y + (len - boxH) / 2;
  const parts = [line(x, y, x, y0), rect(x - 9, y0, 18, boxH, 'fill="none"'), line(x, y0 + boxH, x, y + len)];
  if (label) parts.push(text(x + 14, y + len / 2 + 4, label));
  return parts.join("");
}

/** 円形の電源シンボル（交流/直流）。center に記号、下に label。 */
export function source(cx: number, cy: number, r: number, sym: string, label?: string): string {
  const parts = [circle(cx, cy, r, 'fill="none"'), text(cx, cy + 5, sym, 'text-anchor="middle"')];
  if (label) parts.push(text(cx, cy + r + 16, label, 'text-anchor="middle"'));
  return parts.join("");
}

/** 矢印（ベクトル）。先端に三角、末尾(x1,y1)→先端(x2,y2)。label は先端側。 */
export function arrow(x1: number, y1: number, x2: number, y2: number, label?: string): string {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a = 9;
  const p1: [number, number] = [x2 - a * Math.cos(ang - Math.PI / 7), y2 - a * Math.sin(ang - Math.PI / 7)];
  const p2: [number, number] = [x2 - a * Math.cos(ang + Math.PI / 7), y2 - a * Math.sin(ang + Math.PI / 7)];
  const head = `<polygon points="${x2},${y2} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}" fill="currentColor" stroke="none"/>`;
  const parts = [line(x1, y1, x2, y2), head];
  if (label) {
    const lx = x2 + 8 * Math.cos(ang);
    const ly = y2 + 8 * Math.sin(ang) + (y2 >= y1 ? 12 : -4);
    parts.push(text(lx, ly, label));
  }
  return parts.join("");
}

export interface SvgOptions {
  width: number;
  height: number;
  /** スクリーンリーダー向けの図の説明（必須）。 */
  title: string;
  desc?: string;
}

/** ルート <svg> を組み立てる。body は上記プリミティブの連結。 */
export function svg(opts: SvgOptions, body: string): string {
  const desc = opts.desc ? `<desc>${esc(opts.desc)}</desc>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.width} ${opts.height}" ` +
    `role="img" aria-label="${esc(opts.title)}" ` +
    `font-family="system-ui,sans-serif" font-size="13">` +
    `<title>${esc(opts.title)}</title>${desc}` +
    `<g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</g>` +
    `</svg>`
  );
}
