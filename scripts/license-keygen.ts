#!/usr/bin/env tsx
/**
 * license-keygen.ts — Pro ライセンスの署名鍵ペア（ECDSA P-256）を生成する販売者ツール。
 *
 * 生成物:
 *  - secrets/license-signing-key.json … 秘密鍵＋公開鍵（.gitignore 済み。絶対にコミットしない）
 *  - 標準出力 … web/src/monetization-config.ts に貼る「公開鍵 JWK」スニペット
 *
 * 使い方:
 *   npm run license:keygen            # 初回生成
 *   npm run license:keygen -- --force # 既存の鍵を破棄して作り直す（発行済みキーは全て無効になる）
 *
 * 手順の全体像は docs/strategy/monetization-setup.md を参照。
 */
import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateLicenseKeyPair } from "../lib/license/license.js";
import { atomicWriteFileSync, printHelp } from "./shared.js";

const HELP = `\
license-keygen — Pro ライセンスの署名鍵ペア（ECDSA P-256）を生成する

使い方:
  npm run license:keygen             # secrets/license-signing-key.json を生成
  npm run license:keygen -- --force  # 既存の鍵を上書き（発行済みライセンスは全て無効化）

オプション:
  --force     既存の鍵ファイルがあっても上書きする
  --help, -h  このヘルプを表示して終了

生成後にやること:
  1. 出力された「公開鍵 JWK」を web/src/monetization-config.ts の publicKeyJwk へ貼る
  2. purchaseUrl に決済ページ（Stripe Payment Link / BOOTH 等）の URL を設定する
  3. 販売のたびに npm run license:issue -- --email <購入者> でキーを発行して届ける

⚠️ secrets/ はコミット禁止（.gitignore 済み）。秘密鍵を失うと再発行できなくなるため、
   パスワードマネージャ等へ必ずバックアップすること。
`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const SECRETS_DIR = join(__dirname, "../secrets");
const KEY_FILE = join(SECRETS_DIR, "license-signing-key.json");

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) printHelp(HELP);
  const force = argv.includes("--force");
  const unknown = argv.filter((a) => a.startsWith("-") && a !== "--force");
  if (unknown.length > 0) {
    console.error(`不明なオプションです: ${unknown.join(", ")}（--force / --help のみ対応）`);
    process.exit(1);
  }

  if (existsSync(KEY_FILE) && !force) {
    console.error(
      `既に鍵ファイルがあります: ${KEY_FILE}\n` +
        "作り直すと発行済みライセンスが全て無効になります。本当に作り直す場合のみ --force を付けてください。",
    );
    process.exit(1);
  }

  // 生成と公開鍵の最小化は lib/license の共通ヘルパーに委譲する（config へそのまま貼れる形）。
  const { privateJwk, publicJwk: publicMinimal } = await generateLicenseKeyPair();

  mkdirSync(SECRETS_DIR, { recursive: true });
  atomicWriteFileSync(
    KEY_FILE,
    `${JSON.stringify({ createdAt: new Date().toISOString(), privateJwk, publicJwk: publicMinimal }, null, 2)}\n`,
  );
  // 秘密鍵ファイルは所有者のみ読み書き可にする（他ユーザーからの読み取りを防ぐ）。
  chmodSync(KEY_FILE, 0o600);

  console.log(`✅ 署名鍵を生成しました: ${KEY_FILE}（コミット禁止・要バックアップ）`);
  console.log("");
  console.log("次の JWK を web/src/monetization-config.ts の publicKeyJwk へ貼ってください:");
  console.log("");
  console.log(`  publicKeyJwk: ${JSON.stringify(publicMinimal)},`);
  console.log("");
  console.log("あわせて purchaseUrl（決済ページ URL）も設定すると購入ボタンが表示されます。");
  console.log("ライセンス発行: npm run license:issue -- --email buyer@example.com");
}

void main();
