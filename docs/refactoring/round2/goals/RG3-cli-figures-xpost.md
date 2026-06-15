# RG3: CLI 堅牢化・図ヘルパー・xpost 出力制御

対応: II-124〜II-129（[ideas-round2.md](../ideas-round2.md)） / Wave 1

## 目的（根本原因RR3）

CLI引数パーサがプリミティブで不正引数を黙認し、エラーが段階を区別しない。図SVG生成に重複がある。

## 所有ファイル（これ以外は編集禁止）

- `lib/engine/cli.ts`, `lib/engine/figures/**`, `lib/engine/xpost/**`
- 新規テスト追加のみ: `tests/engine/cli-args.test.ts`（既存テスト変更禁止）

## 他タスクとの契約

- `lib/engine/{generate,validate,narrate,schema}.ts`（RG2）, `templates/`（RG1）は編集禁止・importのみ。
- 既存CLIの正常系の挙動（出力フォーマット・exit code）は不変。フラグ追加は可。
- `figures/`の出力SVG文字列は1バイトも変えない（web/problems.json不変の一部）。

## 実装項目

1. **引数パーサ堅牢化**（II-124）: `--topic`直後が空/欠落の不正をwarning＋デフォルトで処理。
   不明オプションをwarning。短縮形（`-t`等）対応は任意。テスト`tests/engine/cli-args.test.ts`で20+ケース。
2. **段階別エラー**（II-125）: draw/narrate/validateの各段階を区別したcatchとメッセージ。ログレベル分離。
   exit codeは既存維持。
3. **xpost出力制御**（II-126）: 既定で先頭N件（例10）に制限、`--xpost-out <file>`でファイル出力可能に。
   既定挙動（フラグなし）は互換維持。
4. **gen --version**（II-127）: package.jsonのversionを読んで出力。
5. **figures fmt整理**（II-128）: 局所`fmt()`をSVGラベル専用と明示（export整理＋JSDoc警告）。誤用防止。
6. **図プリミティブ抽出**（II-129）: 軸/目盛/ラベル生成の重複を共通ヘルパーに抽出。
   **出力SVGが完全に同一**であることをdiffで確認（problems.json不変の担保）。

## 受け入れ基準

- `npx vitest run tests/engine` 全グリーン（既存無変更）。
- `npm run build:problems` 後 `git diff --exit-code web/problems.json` 差分ゼロ（figures変更の挙動不変証明）。
- 各CLIフラグ（`--version`等）が動作。`npm run gen -- --help` 等が壊れない。
- `npx biome check lib/engine/cli.ts lib/engine/figures lib/engine/xpost` エラーなし。
- `npx tsc --noEmit` がRG3所有起因のエラーなし。
</content>
