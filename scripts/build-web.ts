/**
 * build-web.ts — オフライン学習アプリを esbuild で単一バンドルにする。
 * web/src/app.ts（DOM）が lib/* の純ロジック(scheduler/diagnosis/share-card)を import する。
 * lib は ESM の `.js` 拡張子付き import を使うため、`.js`→`.ts` を解決するプラグインを噛ませる。
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** 相対 import の `.js` 指定を、実在する `.ts` に解決する。 */
const tsResolve = {
  name: "ts-resolve",
  setup(b: import("esbuild").PluginBuild) {
    b.onResolve({ filter: /^\.{1,2}\/.*\.js$/ }, (args) => {
      const tsPath = resolve(args.resolveDir, args.path.replace(/\.js$/, ".ts"));
      if (existsSync(tsPath)) return { path: tsPath };
      return undefined;
    });
  },
};

async function main() {
  await build({
    entryPoints: [join(ROOT, "web/src/app.ts")],
    bundle: true,
    format: "esm",
    target: "es2022",
    platform: "browser",
    outfile: join(ROOT, "web/dist/app.js"),
    sourcemap: true,
    minify: true,
    plugins: [tsResolve],
    logLevel: "info",
  });
  console.error("web バンドルを web/dist/app.js に出力しました。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
