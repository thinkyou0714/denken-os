# コントリビューションガイド

DENKEN-OS は「電験合格を再現性のある学習プロセスに体系化する」プロジェクトです。
コード・問題データ・ドキュメントへの貢献を歓迎します。

## セットアップ

Node 22 (`.nvmrc` 参照・`engines>=20`) が必要です。
`.npmrc` の `engine-strict=true` により Node 20 未満では `npm install` が即失敗します。

```bash
npm install
npm run build:web          # web/src/ をバンドル → web/dist/（web を編集した場合は毎回）
npm test                   # ユニットテスト（851件）
npm run lint               # Biome（lint + format チェック）
npm run typecheck          # 型チェック（lib/scripts/tests）
npm run typecheck:web      # 型チェック（web app）
npm run validate:data      # data/ の問題を problem-schema.json で検証
npm run verify             # 上記すべてを一括実行（CI と同一手順）
```

## 開発の約束（絶対原則）

`docs/x-strategy/README.md` の「絶対原則」をコードでも守ります。

1. **間違った問題・著作権違反を絶対に出さない。** 1問の事故が全てを壊す。
   - 問題の正解は **コードで決定論的に算出**する（LLM に出させない）。`lib/engine/`。
   - 全問が `problem-schema.json`（zod / ajv の両方）と投稿前チェックを通ること。
   - 過去問由来は `source.type` と `citation` を必須にする（`lib/ingest/`）。
2. **秘密情報をコミットしない。** API キー等は `.env`（`.env.example` を参照）。
3. **moat と安全は自動化しない。** 会話・コミュニティの温度・品質の最終承認・訂正の承認は人間。

## 新規テンプレート実装ガイド（II-196）

### ステップ 1: `defineTemplate` ファクトリを使う（必須）

`lib/engine/templates/<topic>.ts` に `defineTemplate` ファクトリを使って実装する。
**手書き `generate`/`generateFrom` 委譲は禁止**（CI の全テンプレ-ファクトリ製チェックに引っかかる）。

```ts
// lib/engine/templates/<topic>.ts の骨格
import { formatClean, isCleanAnswer } from "../clean.js";
import { constrainRange, defineTemplate, isNonNegative, pick } from "./helpers.js";
import { POWER_FACTOR_TOLERANCE } from "./helpers.js"; // 力率チェック時

type Params = { param1: number; param2: number };

const PARAM1_SET: ReadonlyArray<number> = [10, 20, 30] as const;
const PARAM2_SET: ReadonlyArray<number> = [0.8, 0.85, 0.9] as const;

export const myTemplate = defineTemplate<Params>({
  topic: "トピック名（日本語）",
  subject: "理論",           // 理論 / 電力 / 機械 / 法規 / 電力管理 / 機械制御
  exam: "denken2_primary",  // or denken2_secondary
  difficulty: 3,            // 1〜5
  paramSpecs: {
    param1: { unit: "kW", realistic_range: [5, 50] },
    param2: { realistic_range: [0.7, 1.0] },
  },
  paramOrder: ["param1", "param2"],
  draw(rng) {
    return { param1: pick(PARAM1_SET, rng), param2: pick(PARAM2_SET, rng) };
  },
  buildFrom({ param1, param2 }) {
    // 物理制約チェック（constrainRange / isNonNegative を必ず使う）
    if (!constrainRange(param2, 0, 1 + POWER_FACTOR_TOLERANCE)) return null;
    const answer = param1 / param2;
    if (!isNonNegative(answer)) return null;
    if (!isCleanAnswer(answer)) return null;
    return {
      format: "numeric",
      params: {
        param1: { value: param1, unit: "kW", realistic_range: [5, 50] },
        param2: { value: param2, realistic_range: [0.7, 1.0] },
      },
      answerValue: answer,
      answerUnit: "A",
      answerText: formatClean(answer),
      facts: { param1, param2, answer },
      defaultStatement: `...問題文...`,
      defaultSolution: ["導出式1", "導出式2"],
      physicallyValid: true,
    };
  },
});
```

#### 物理制約チェックのチェックリスト

- [ ] 効率 η≤1: `constrainRange(eta, 0, 1)` — `lib/engine/templates/helpers.ts`
- [ ] 力率 cosφ≤1: `constrainRange(cosPhi, 0, 1 + POWER_FACTOR_TOLERANCE)` — `POWER_FACTOR_TOLERANCE` は `lib/shared/constants.ts` から re-export 済み
- [ ] 負値ガード: `isNonNegative(value)` — `lib/engine/templates/helpers.ts`
- [ ] ゼロ割: `percentage(n, d)` は `denominator===0` なら `NaN` を返す。呼び出し側で `Number.isNaN` を確認すること

### 解剖例: `electric-heating.ts`（電気加熱の所要時間）

`lib/engine/templates/electric-heating.ts` は物理式の導出・境界値・defineTemplate の使い方の
良いリファレンスになる。

```
物理式: t = c·m·Δθ / (P·η) [s] → /60 → [min]
  c = 4.2 kJ/(kg·K)（水の比熱・定数）
境界: m>0, ΔΘ>0, P>0, 0<η≤1 をすべてチェックしてから計算
  isCleanAnswer(tMin) で「綺麗な答え」（小数桁が少ない・整数等）のみ採用
```

定数は `readonly` な配列（`ReadonlyArray<number>`・`as const`）で宣言し、
`pick()` でランダムに1要素を選ぶパターンが全テンプレートで統一されている。

### ステップ 2: レジストリに登録

`lib/engine/templates/index.ts` のエクスポートリストに追加する。

### ステップ 3: テストを追加

`tests/engine/` に以下の2種類のテストを追加する:

```ts
// ① 固定値検算（物理式の回帰防止）
it("electric-heating: 固定値", () => {
  const result = template.generateFrom({ mass: 100, delta_theta: 30, power: 3.5, efficiency: 0.8 });
  expect(result?.answerValue).toBeCloseTo(75, 3);
});

// ② N問生成 → 全件 validate 通過
it("N問生成→validate", () => {
  const problems = Array.from({ length: 20 }, (_, i) => template.generate(seededRng(i)));
  const valid = problems.filter(Boolean);
  expect(valid.length).toBeGreaterThan(0);
  for (const p of valid) expect(validateProblem(p!)).toHaveLength(0);
});
```

- [ ] `defineTemplate` を使っている（手書き委譲でない）
- [ ] 物理制約チェック（`constrainRange`/`isNonNegative`/ゼロ割確認）が `buildFrom` 冒頭にある
- [ ] 固定値検算テスト（手計算期待値）がある
- [ ] 全件 `validateProblem` 通過テストがある
- [ ] `lib/engine/templates/index.ts` に登録している

### スクリプト使用例（II-197）

主なスクリプトの代表的な使用パターン:

```bash
# gen: 特定トピックで問題を生成してプレビュー
npm run gen -- --topic 電気加熱の所要時間 --count 3
npm run gen -- -t 三相交流電力 -v          # --topic の短縮形 -t、版数表示 -v

# gen: xpost スレッドも生成し最初の5件だけ出力、ファイルにも保存
npm run gen -- --topic 電気加熱の所要時間 --count 3 --xpost --xpost-limit 5 --xpost-out out/post.txt

# build:problems: 全88テンプレから web/problems.json を再生成（1トピック5問に変更する例）
npm run build:problems -- --per-topic 5

# validate:data: data/ 以下の手動問題をスキーマ検証
npm run validate:data

# audit:status: 問題数・形式・監修状況の棚卸し
npm run audit:status
npm run audit:status -- --strict   # リリース前の厳格チェック（validated 数が閾値未満で失敗）

# export:vault: 問題を Obsidian Markdown に書き出し
npm run export:vault -- --out out/vault
```

引数なしで `--help`（`-h`）を渡すと各スクリプトの使い方が表示される:

```bash
npm run gen -- --help
npm run build:problems -- --help
```

## PR の前に

プッシュ前は `npm run verify` を実行してください（lint / 型 / データ検証 / テスト / ビルドを一括確認できます）。
プロジェクトは husky を導入しない方針ですが（CI がゲートを担う）、`verify` は CI と完全に同じ手順です。

- [ ] `npm run verify` が緑（全ステップ通過）
- [ ] `web/src/` を変更した場合は `npm run build:web` を確認した
- [ ] 新規ロジックにテストを追加した
- [ ] 問題データを足した場合、`source` と（改題なら）`citation` を明記した
- [ ] 秘密情報・個人情報を含めていない

## ライセンス

コード = MIT、データ/ドキュメント = CC-BY-SA-4.0（[`LICENSES.md`](LICENSES.md)）。
コントリビュートした内容は同ライセンスで配布されることに同意したものとみなします。
