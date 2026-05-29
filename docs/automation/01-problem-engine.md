# 実装指示 01: 問題生成＆検証エンジン (MVP)

> ステータス: 実装済み（コア）。 実装: `lib/engine/`。着手点としての本命（戦略の核 = moat）。

## 0. ゴール（一文）
電験二種の問題を「答えが確実に正しい状態」で無限生成し、
`problem-schema.json` 準拠の JSON として出力する CLI エンジンを作る。
これが「今日の一問」とアプリDBの両方に供給する核。

## 1. 設計の核心思想 ★最重要（ハルシネーション対策の根本解）
- **数値の正解は LLM に出させない。コードで計算する。**
  LLM(Claude API)の役割は「問題文の言い回し」と「解説の文章化」だけ。
- 「係数いじりで無限生成」＝ **パラメトリック・テンプレート**で実現。
  各論点ごとに `params → { 正解, 各量, 誤答選択肢, 制約 }` を返す純関数を用意し、
  正解は必ずこの関数（決定的コード）から得る。
- LLM が書いた解説の最終値が、コードの正解と一致するかを最後に検証（不一致なら破棄）。

## 2. 必読の参照ファイル
- `docs/x-strategy/templates/problem-schema.json`   … 出力スキーマ（厳守）
- `docs/x-strategy/03-quality-pipeline.md`          … 検算5ステップ／チェックリスト
- `docs/x-strategy/04-compliance.md`                … 出典・改題ルール
- `docs/x-strategy/templates/problem-sample.md`     … T-0001（三相電力）の正解実装例

## 3. 技術スタック / 配置
- TypeScript + Node（README の Next.js/Supabase スタックに整合）
- 依存: `@anthropic-ai/sdk`（解説生成）, `zod`（実行時検証）, `vitest`（テスト）
- 配置: `lib/engine/`（純粋ロジックに保ち、後で Next.js/Supabase から import）
- LLM は interface 化して差し替え可能に（後で Ollama 等オフライン生成へ）

## 4. モジュール構成
```
lib/engine/
  templates/
    types.ts             // Template<TParams> インターフェース
    three-phase-power.ts // 最初の1本（T-0001 を再現）
    index.ts             // topic名 → Template レジストリ
  generate.ts            // params サンプリング → コードで正解算出 → 選択肢組立
  narrate.ts             // Claude API で statement/solution 文章化（数値整合チェック付）
  validate.ts            // zod + clean-answer + physically-valid + answer∈choices
  gate.ts                // status を validated にする条件判定
  toXPost.ts             // validated → 朝出題/夜解答テキスト（出典フッター自動付与）
  cli.ts                 // 入口
```

## 5. 機能要件（03 の検算5ステップにマップ）
- [1] 生成: realistic_range 内で params サンプリング
- [2] 数値検査: 正解が「綺麗な値」か（整数 or 小さい分母の有理数）。汚ければ振り直し→ダメなら捨て
- [3] 自動検算: 正解は純関数で算出（solver_checked=true 根拠）。誤答は典型ミスから生成
- [4] 整合確認: 解説の最終数値をパースし、コード正解と一致を確認（不一致は破棄）
- [5] 出典付与: original 主軸。改題なら citation 必須

## 6. validate が満たす不変条件（schema の allOf を実コードでも担保）
- 出力が `problem-schema.json` を通る（zod 型生成 or ajv 直接検証）
- multiple_choice: choices ≥ 2 かつ **answer ∈ choices**（schema 不可なのでコードで）
- status=validated/published は検証4項目 true
- source.type ≠ original のとき citation 必須 / stats 範囲（answered≥0, rate∈[0,1]）

## 7. 最初のテンプレート（three-phase-power.ts）
- T-0001（平衡三相Y結線・線間電圧・Z=R+jX → 三相有効電力 P）を再現
- P = 3·((V/√3)/|Z|)²·R をコード計算。3-4-5/6-8-10 系で綺麗
- 誤答: ①力率二重掛け ③力率掛け忘れ(=皮相) ④√3忘れ を自動生成

## 8. 受け入れ条件（done の定義）
- [ ] `three-phase-power` で 100 問生成 → 全件 validate 通過
- [ ] 全件 answer∈choices / clean / physically_valid
- [ ] T-0001 と同 params で sample と同じ正解(3.2kW)・選択肢
- [ ] 改題で citation 無しは reject（負テスト）
- [ ] 検証4項目いずれか false は validated にできない（負テスト）
- [ ] 解説の最終値とコード正解の不一致を検出して破棄（モック負テスト）
- [ ] `npm run gen -- --topic 三相交流電力 --count 5` で JSON 出力

## 9. CLI
- `gen --topic <名> --count <n> [--source original|modified] [--xpost] [--out file.json]`
- 既定は validated のみ。`--include-drafts` で draft も出す

## 10. リスク / コンプラ / セキュリティ
- `ANTHROPIC_API_KEY` は `.env`。**コミット禁止**（.gitignore 確認）
- Claude API 利用規約で生成物の商用再利用可否を確認し README に明記
- 解説は自作生成のみ（既存解説の引き写し禁止）

## 11. やらないこと（MVPスコープ外）
- 記述(descriptive)の自動採点（出題形式の生成までに留める）
- Supabase 保存・Next.js UI・X 実投稿（本エンジンは「JSONを吐く」まで）
- 汎用数式ソルバー（テンプレ束縛で十分。汎用化しない）
