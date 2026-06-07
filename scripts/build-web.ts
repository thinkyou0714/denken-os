/**
 * build-web.ts — オフライン学習アプリを esbuild で単一バンドルにする。
 * web/src/app.ts（DOM）が lib/* の純ロジック(scheduler/diagnosis/share-card)を import する。
 * lib は ESM の `.js` 拡張子付き import を使うため、`.js`→`.ts` を解決するプラグインを噛ませる。
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/**
 * クライアントバンドルにサーバ専用シークレットが混入していないか機械検査する。
 * service_role キー（Supabase の全権 JWT）が公開バンドルに載ると RLS を完全に迂回されるため、
 * 検出したらビルドを失敗させる（anon キーは公開前提なので対象外）。
 */
export function assertNoServerSecrets(bundle: string): void {
  const needles = ["service_role", "SUPABASE_SERVICE_ROLE", "SUPABASE_SERVICE_KEY"];
  const hit = needles.find((n) => bundle.includes(n));
  if (hit) {
    throw new Error(
      `web バンドルにサーバ専用シークレットの痕跡 "${hit}" を検出しました。` +
        `service_role キー等をクライアントへ混入させないでください（RLS 迂回の恐れ）。`,
    );
  }
}

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

  // セキュリティ: サーバ専用シークレットの client 混入を機械検査（混入ならビルド失敗）。
  assertNoServerSecrets(readFileSync(join(ROOT, "web/dist/app.js"), "utf8"));
  console.error("web バンドルを web/dist/app.js に出力しました。");
}

// エントリスクリプトとして実行されたときだけビルドする（import 時は副作用なし）。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
