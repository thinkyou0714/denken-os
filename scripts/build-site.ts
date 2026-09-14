import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

for (const script of ["scripts/fetch-official-papers.ts", "scripts/build-service-data.ts", "scripts/build-web.ts"]) {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${script} failed`);
}
await rm("dist", { recursive: true, force: true });
await mkdir("dist/client", { recursive: true });
await cp("web", "dist/client", {
  recursive: true,
  filter: (path) => !path.startsWith("web/src") && !path.endsWith(".map") && !path.endsWith("tsconfig.json"),
});
const html = (await readFile("web/index.html", "utf8")).replace(
  "<head>",
  '<head>\n<meta name="denken-platform" content="sites">',
);
await writeFile("dist/client/index.html", html);
// A distinct shell version keeps the hosted and standalone builds independent.
const sw = await readFile("web/sw.js", "utf8");
await writeFile(
  "dist/client/sw.js",
  sw.replace(
    /const CACHE = "[^"]+"/,
    `const CACHE = "denken-site-${createHash("sha256").update(html).update(sw).digest("hex").slice(0, 16)}"`,
  ),
);
await build({
  entryPoints: ["site/worker.ts"],
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
});
await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await cp("drizzle", "dist/.openai/drizzle", { recursive: true });
console.info("Sites Worker, static assets and schema migrations are ready.");
