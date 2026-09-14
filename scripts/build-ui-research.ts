import { readFileSync, writeFileSync } from "node:fs";

// A small renderer for this checked-in report's headings, paragraphs and tables.
// It escapes source text before recognizing explicit Markdown links.
const source = readFileSync("docs/service/UI_RESEARCH.md", "utf8");
const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const inline = (text: string) =>
  escapeHtml(text).replace(
    /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
const parts: string[] = [],
  toc: string[] = [];
const lines = source.split("\n");
let section = 0;
for (let i = 0; i < lines.length; i++) {
  const line = (lines[i] ?? "").trim();
  if (!line) continue;
  const heading = /^(#{1,3}) (.+)$/.exec(line);
  if (heading) {
    const level = (heading[1] ?? "#").length;
    const id = `section-${++section}`;
    parts.push(`<h${level} id="${id}">${inline(heading[2] ?? "")}</h${level}>`);
    if (level === 2) toc.push(`<a href="#${id}">${escapeHtml(heading[2] ?? "")}</a>`);
  } else if (line.startsWith("|")) {
    const rows: string[] = [];
    let first = true;
    while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
      const row = (lines[i] ?? "").trim();
      if (!/^\|[\s:|-]+\|$/.test(row)) {
        const cells = row
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        rows.push(
          `<tr>${cells.map((cell) => (first ? `<th scope="col">${inline(cell)}</th>` : `<td>${inline(cell)}</td>`)).join("")}</tr>`,
        );
        first = false;
      }
      i++;
    }
    i--;
    parts.push(
      `<div class="table-scroll" tabindex="0" role="region" aria-label="比較表"><table><thead>${rows[0]}</thead><tbody>${rows.slice(1).join("")}</tbody></table></div>`,
    );
  } else {
    const paragraph = [line];
    while (i + 1 < lines.length && lines[i + 1]?.trim() && !/^(#|\|)/.test(lines[i + 1] ?? ""))
      paragraph.push((lines[++i] ?? "").trim());
    parts.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }
}
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DENKEN-OS 学習UIの市場調査と改善設計</title><style>
*{box-sizing:border-box}html{scroll-padding-top:24px}body{margin:0;color:#202a37;background:#fff;font:17px/1.9 system-ui,-apple-system,"Hiragino Sans",Meiryo,sans-serif}a{color:#234f77;text-underline-offset:3px;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #234f77;outline-offset:4px}header{border-bottom:1px solid #cbd2da;padding:18px 28px;display:flex;gap:24px;flex-wrap:wrap}header a{font-size:15px}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:44px;max-width:1280px;margin:auto;padding:32px 28px}nav{position:sticky;top:24px;align-self:start}nav a{display:block;font-size:14px;color:#4c5867;padding:7px 0;text-decoration:none}main{min-width:0}h1{font-size:30px;line-height:1.45;margin:0 0 28px;letter-spacing:-.015em}h2{font-size:23px;line-height:1.5;margin:48px 0 20px;padding-top:18px;border-top:1px solid #cbd2da}h3{font-size:19px;line-height:1.6;margin:32px 0 14px}p{margin:0 0 20px;max-width:48em;overflow-wrap:anywhere}.table-scroll{overflow:auto;margin:24px 0}table{border-collapse:collapse;width:100%;min-width:600px;font-size:14px;line-height:1.8}td,th{text-align:left;vertical-align:top;padding:14px 12px;border-bottom:1px solid #d2d8df}th{background:#f1f3f5;color:#202a37}td:first-child{font-weight:600;min-width:100px}main>p:last-child{font-size:14px;color:#536070}@media(max-width:900px){.layout{display:block;padding:28px 20px}nav{position:static;margin-bottom:32px;columns:2}nav a{min-height:44px}h1{font-size:26px}}@media print{header,nav{display:none}.layout{display:block;padding:0}body{font-size:10.5pt;line-height:1.8}h1{font-size:22pt}h2{font-size:16pt;break-after:avoid}h3{break-after:avoid}table{font-size:9pt;min-width:0}tr{break-inside:avoid}.table-scroll{overflow:visible}a{color:inherit}p{widows:3;orphans:3}@page{size:A4;margin:17mm}}
</style></head><body><header><a href="../#lab/today">学習画面に戻る</a><a href="UI_RESEARCH.md" download>調査・設計をMarkdownで保存</a></header><div class="layout"><nav aria-label="調査レポートの目次">${toc.join("")}</nav><main>${parts.join("\n")}</main></div></body></html>`;
writeFileSync("web/service/ui-research.html", html);
writeFileSync("web/service/UI_RESEARCH.md", source);
