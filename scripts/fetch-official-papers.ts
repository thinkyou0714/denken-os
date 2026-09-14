import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import manifest from "../web/service/official/manifest.json";

await mkdir("web/service/official", { recursive: true });
for (const asset of manifest.files) {
  if (!/^[a-z0-9_]+\.pdf$/.test(asset.file)) throw new Error("Invalid PDF filename");
  const url = new URL(asset.url);
  if (url.protocol !== "https:" || url.hostname !== "www.shiken.or.jp") throw new Error("Unsupported official source");
  const path = `web/service/official/${asset.file}`;
  let bytes: Uint8Array;
  try {
    bytes = await readFile(path);
  } catch {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Official PDF download failed: ${asset.file} (${response.status})`);
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
    throw new Error(`Official PDF changed; review required: ${asset.file}`);
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("Invalid PDF data");
  await writeFile(path, bytes);
}
console.info(`Verified ${manifest.files.length} pinned official PDFs.`);
