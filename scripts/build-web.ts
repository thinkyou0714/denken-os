/**
 * build-web.ts — オフライン学習アプリを esbuild で単一バンドルにする。
 * web/src/app.ts（DOM）が lib/* の純ロジック(scheduler/diagnosis/share-card)を import する。
 * lib は ESM の `.js` 拡張子付き import を使うため、`.js`→`.ts` を解決するプラグインを噛ませる。
 *
 * ビルド後に生成物のサイズレポート（生バイト・gzip サイズ）を出力する。
 * sourcemap の sources が空の場合は異常として throw する。
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
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

/** バイト数を人間が読みやすい形式に変換する。 */
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** ファイルのサイズ情報（生バイト・gzip サイズ）を取得する。 */
function getFileSizeInfo(filePath: string): { raw: number; gzip: number } {
  const raw = statSync(filePath).size;
  const content = readFileSync(filePath, "utf-8");
  const gzip = gzipSync(content).length;
  return { raw, gzip };
}

/** サイズレポートを表形式で出力する。 */
function printSizeReport(files: Array<{ name: string; raw: number; gzip: number }>): void {
  const cols = {
    name: Math.max(8, ...files.map((f) => f.name.length)),
    raw: Math.max(8, ...files.map((f) => fmtBytes(f.raw).length)),
    gzip: Math.max(8, ...files.map((f) => fmtBytes(f.gzip).length)),
  };
  const sep = `+-${"-".repeat(cols.name)}-+-${"-".repeat(cols.raw)}-+-${"-".repeat(cols.gzip)}-+`;
  const header = `| ${"ファイル".padEnd(cols.name)} | ${"生サイズ".padEnd(cols.raw)} | ${"gzip".padEnd(cols.gzip)} |`;
  console.error(sep);
  console.error(header);
  console.error(sep);
  for (const f of files) {
    const row = `| ${f.name.padEnd(cols.name)} | ${fmtBytes(f.raw).padStart(cols.raw)} | ${fmtBytes(f.gzip).padStart(cols.gzip)} |`;
    console.error(row);
  }
  console.error(sep);
}

async function main() {
  const outfile = join(ROOT, "web/dist/app.js");
  const sourcemapFile = join(ROOT, "web/dist/app.js.map");
  const problemsFile = join(ROOT, "web/problems.json");

  let result: Awaited<ReturnType<typeof build>>;
  try {
    result = await build({
      entryPoints: [join(ROOT, "web/src/app.ts")],
      bundle: true,
      format: "esm",
      target: "es2022",
      platform: "browser",
      outfile,
      sourcemap: true,
      minify: true,
      plugins: [tsResolve],
      logLevel: "silent",
      metafile: true,
    });
  } catch (e) {
    // esbuild の BuildFailure は errors プロパティを持つ。
    if (e && typeof e === "object" && "errors" in e) {
      const errs = (e as { errors: Array<{ text: string; location?: { file: string; line: number; column: number } }> })
        .errors;
      console.error("esbuild ビルドエラー:");
      for (const err of errs) {
        const loc = err.location ? ` (${err.location.file}:${err.location.line}:${err.location.column})` : "";
        console.error(`  ✗ ${err.text}${loc}`);
      }
    } else {
      console.error(e);
    }
    process.exit(1);
  }

  if (result.errors.length > 0) {
    console.error("esbuild ビルドエラー:");
    for (const err of result.errors) {
      const loc = err.location ? ` (${err.location.file}:${err.location.line}:${err.location.column})` : "";
      console.error(`  ✗ ${err.text}${loc}`);
    }
    process.exit(1);
  }

  // sourcemap の sources が空でないことを検証する。
  if (existsSync(sourcemapFile)) {
    const smContent = readFileSync(sourcemapFile, "utf-8");
    let sm: { sources?: string[] };
    try {
      sm = JSON.parse(smContent) as { sources?: string[] };
    } catch {
      throw new Error("sourcemap ファイルのパースに失敗しました。");
    }
    if (!Array.isArray(sm.sources) || sm.sources.length === 0) {
      throw new Error("sourcemap の sources が空です。バンドル設定を確認してください。");
    }
  }

  // サイズレポートを出力する。
  const reportFiles: Array<{ name: string; raw: number; gzip: number }> = [];
  for (const [label, path] of [
    ["app.js", outfile],
    ["app.js.map", sourcemapFile],
    ["problems.json", problemsFile],
  ] as [string, string][]) {
    if (existsSync(path)) {
      const { raw, gzip } = getFileSizeInfo(path);
      reportFiles.push({ name: label, raw, gzip });
    }
  }

  console.error("web バンドルを web/dist/app.js に出力しました。");
  if (reportFiles.length > 0) {
    console.error("\nビルド生成物サイズ:");
    printSizeReport(reportFiles);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
