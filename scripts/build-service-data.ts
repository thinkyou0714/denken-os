import { createHash } from "node:crypto";
import "./build-ui-research.js";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { templateSupervisionReport } from "../lib/audit/template-supervision.js";
import { problemSchema } from "../lib/engine/schema.js";
import { getTemplate, listTopics } from "../lib/engine/templates/index.js";
import { validateProblem } from "../lib/engine/validate.js";

const output = "web/service";
mkdirSync(output, { recursive: true });
const verified = readdirSync("data/problems")
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => problemSchema.parse(JSON.parse(readFileSync(`data/problems/${f}`, "utf8"))))
  .filter(
    (p) =>
      (p.status === "validated" || p.status === "published") &&
      (p.validation.human_checked || p.validation.supervisor_checked),
  );
for (const p of verified) if (!validateProblem(p).ok) throw new Error(`公開対象の検証失敗: ${p.id}`);
const revision = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const catalogue = verified.map((problem) => ({
  ...problem,
  revision: revision(problem),
  verificationOrigin: "existing-repository",
  family: problem.topic,
}));
const content = JSON.stringify(catalogue);
const file = `catalog-${revision(catalogue).slice(0, 16)}.json`;
writeFileSync(`${output}/${file}`, content);
writeFileSync(`${output}/catalog.json`, content);
const original = JSON.parse(readFileSync("web/problems/manifest.json", "utf8"));
const shards = original.shards.map((s: { file: string; subject: string; count: number }) => ({
  ...s,
  sha256: createHash("sha256")
    .update(readFileSync(`web/problems/${s.file}`, "utf8"))
    .digest("hex"),
}));
writeFileSync(
  `${output}/manifest.json`,
  JSON.stringify(
    {
      version: revision(catalogue),
      catalog: { file, sha256: createHash("sha256").update(content).digest("hex"), count: catalogue.length },
      experimental: { total: original.total, shards },
    },
    null,
    2,
  ),
);
console.info(`Service catalogue: ${catalogue.length} existing human-checked records; generated drafts stay separate.`);

const templates = listTopics().flatMap((topic) => {
  const template = getTemplate(topic);
  return template ? [template] : [];
});
const ledger = JSON.parse(readFileSync("data/supervision/templates.json", "utf8"));
const report = templateSupervisionReport({ templates, ledger });
writeFileSync(`${output}/template-supervision.json`, JSON.stringify(report, null, 2));

const implementation = JSON.parse(readFileSync("docs/service/implementation-plan.json", "utf8")) as {
  entries: {
    id: number;
    title: string;
    priority: string;
    software: string;
    done: string;
    remaining: string;
    implementation: string[];
  }[];
};
const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const rows = implementation.entries
  .map(
    (item) =>
      `<tr><th scope="row">${item.id}<br>${escapeHtml(item.priority)}</th><td><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.done)}</p><details><summary>実装箇所</summary>${item.implementation.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</details></td><td>${escapeHtml(item.software)}<p>${escapeHtml(item.remaining)}</p></td></tr>`,
  )
  .join("");
writeFileSync(
  `${output}/implementation.html`,
  `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DENKEN-OS 100案の実装・検証台帳</title><style>body{font:16px/1.8 system-ui,sans-serif;max-width:1150px;margin:32px auto;padding:0 20px;color:#211d16;background:#fcfaf4}table{border-collapse:collapse;width:100%}td,th{padding:16px 12px;border-bottom:1px solid #c6bda2;text-align:left;vertical-align:top}th{min-width:42px}p{margin:.6em 0}a{color:#8a3a1a}details{overflow-wrap:anywhere} @media(max-width:700px){table,tr,td,th{display:block}tr{border-bottom:2px solid #c6bda2}td,th{border:0;padding:8px 0}}</style><main><a href="../#lab">学習ラボへ戻る</a><h1>100案の実装・検証台帳</h1><p>番号順にP0（正確性・保存）から実装。機能の実装と、専門家の監修・外部接続・利用者の実測を分けて記録しています。すべての効果検証が完了したことを示すものではありません。</p><p><a href="implementation-plan.json" download>100案をJSONで保存</a> ／ <a href="OPERATIONS.md" download>運用・巻き戻し・残る確認</a></p><table><thead><tr><th>番号</th><th>案と完了条件</th><th>状態と残る確認</th></tr></thead><tbody>${rows}</tbody></table></main></html>`,
);
writeFileSync(`${output}/implementation-plan.json`, readFileSync("docs/service/implementation-plan.json", "utf8"));
writeFileSync(`${output}/OPERATIONS.md`, readFileSync("docs/service/OPERATIONS.md", "utf8"));
