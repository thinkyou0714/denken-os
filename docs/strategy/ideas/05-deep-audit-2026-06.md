# コードベース深掘り監査 100（2026-06）── 根本原因 × ベストプラクティス

`lib/`（約3000行）・`web/`・`scripts/`・`.github/`・`supabase/` を全ファイル精読し、
**潜在バグ・堅牢性・正しさ・ベストプラクティス**の観点で 10テーマ×10＝100項目を洗い出した記録。
既存の戦略向け [`04-100point-fixes.md`](04-100point-fixes.md) の「コード版」。

各項目の状態:
- ✅ **本監査で実装**（このPR）
- 📋 **推奨**（人間判断／次段で実施）
- ✓ **確認済み・良好**（既存実装が妥当だと確認）

> 前提: 監査時点で `lint / typecheck / typecheck:web / validate:data / test(coverage) / build:web` は全て緑。
> よって対象は「壊れた赤」ではなく**潜在的な正しさと堅牢性**。設計の根幹（正解をコードで決定論算出し
> 解説の最終数値と照合する反ハルシネーション機構、`status=validated` の検証4項目ゲート、依存の一方向性）は
> 妥当と確認し、**壊さない**ことを最優先にした。

---

## A. 採点・学習ロジックの正しさ
1. ✅ **numeric 回答の文字列完全一致バグ**（`web/src/app.ts`）。`"50"≠"50.0"`, `"3.2"≠"3.20"`, 全角数字が誤判定。
   → `web/src/grade.ts` を新設し numeric は**数値の許容誤差比較**、選択式/記述は厳密一致に分離。
2. ✅ **入力正規化の欠如**。全角数字・桁区切りカンマ・空白を `normalizeNumericInput` で吸収。
3. ✅ **ストリークの UTC 日境界**（`web/src/store.ts`）。朝7時(JST)の学習が前日扱いになり連続日数が途切れる。
   → 日境界を**既定 JST(+9h)・設定可能**に。`todayMinutes` も同様に是正。
4. ✅ **numeric 入力が Enter 送信不可**（UX）。`keydown=Enter` で回答できるよう配線。
5. ✓ **SM-2 の ease 更新式**（`lib/scheduler/sm2.ts`）は標準式・`MIN_EASE=1.3` クランプで妥当。
6. ✓ **FSRS は ts-fsrs に委譲**（独自発明しない）。`request_retention` を上げると間隔が縮む挙動もテストで確認。
7. ✓ **弱点診断の順序非依存**（`aggregateByTopic` の `Math.max(dueMs)`）は既に是正済み（CHANGELOG 参照）。
8. 📋 **`weaknessScore` が試行回数に微加点**。練習量の多い論点をわずかに優先する設計意図だが、
   「弱点ほど優先」と整合させるなら符号反転や重みの再検討を推奨（影響は最大0.5と小）。
9. ✅ **記述(descriptive)の自己採点**は `app.ts` のセンチネルで実装。`isAnswerCorrect` の厳密一致経路で回帰防止テスト追加。
10. 📋 **直前の同一問題の連続出題**（`pickNext` の純ランダム）。直近出題の除外キューを推奨（MVPでは許容）。

## B. 生成エンジン（CLI・narrate・テンプレート）
11. ✅ **CLI が import で `main()` 実行**（`lib/engine/cli.ts`）。テストが読み込むだけで `process.exit` する。
    → `import.meta.url === pathToFileURL(argv[1])` で**直接実行時のみ**に限定（テスト容易性）。
12. ✅ **`--count` 無検証**（`NaN`/負/非整数で無言の空生成）。`argErrors` で 1〜100000 の整数に検証。
13. ✅ **`--source` 無検証**。enum 外を弾く。`original` 以外で `--citation` 必須も明示エラー化。
14. ✅ **`--seed` 無検証**。非数値を弾く。`--help`/`-h` と USAGE を追加。
15. ✅ **`parseArgs`/`argErrors`/`makeRng` をエクスポート**しテスト可能化（cli カバレッジ 0%→過半）。
16. ✓ **反ハルシネーション照合 `narrationMatchesAnswer`**（`validate.ts`）は、3相電力の別解行（"√3"の"3"）と
    干渉するため「解説全体に想定値が出現するか」を採る設計。**あえて変更せず**正負の回帰テストで固定。
17. ✓ **全7テンプレートの数値式**（三相電力 `V²R/(R²+X²)`、合成抵抗、誘導機速度、静電エネルギー、
    需要率、B種接地、電圧変動率）を手検算と照合し正確と確認。誤答も「成立する典型ミス」で妥当。
18. ✓ **綺麗な値ゲート `isCleanAnswer`**（2桁小数で割り切れ）と係数の Pythagorean ペア採用は妥当。
19. ✅ **テンプレ文の文字列連結**（`+`）を**テンプレートリテラルに統一**（lint info 一掃、生成文字列は不変）。
20. 📋 **`generate` の confidence がハードコード 0.9**。`minConfidence` 足切りが実質無効。
    監修・実測正答率を confidence に反映する設計を推奨（スキーマは対応済み）。

## C. データ整合・スキーマ
21. ✓ **zod ↔ JSON Schema の二重定義ドリフト**は `schema-consistency.test.ts` で検知（妥当）。
22. ✓ **`answer ∈ choices`** は draft-07 で表現不可のため `validate.ts`/`validate-problems.ts` の両方でコード検証。
23. ✓ **`status=validated|published` の検証4項目ゲート**は zod superRefine と ajv allOf の両方で担保。
24. ✓ **`source.type≠original` の citation 必須**は zod refine と ajv if/then と CLI で三重に担保。
25. ✅ **export-vault が無検証出力**（`scripts/export-vault.ts`）。`validateProblem` で**不正をスキップ＋警告**。
26. ✓ **検証済みサンプル T-0001〜0003** は ajv 通過・手検算済みと確認。
27. 📋 **`params.realistic_range` と実際の draw レンジの突き合わせ**は未自動化。テンプレ単位の不変条件テストを推奨。
28. ✓ **numeric/descriptive は choices を持たない**分岐は generate/schema/mapper で一貫。
29. 📋 **ID 連番の衝突回避**（`makeId` は prefix+連番）。複数バッチ統合時の重複検出を ingest 同様に推奨。
30. ✓ **ingest の重複検出**（正規化キー）・出典メタ必須・要手修正フラグは妥当。

## D. 永続化・ストア
31. ✅ **file-store の非原子書き込み**（`lib/store/file-store.ts`）。クラッシュ/並行で JSON 破損の恐れ。
    → **temp ファイル＋`renameSync`** で原子的差し替えに。
32. ✅ **supabase-store の I/O ラッパ未テスト**（8%）。疑似 SupabaseClient で upsert/get/list/append/byUser/set と
    **error 伝播**を end-to-end 検証（93%超へ）。
33. ✓ **行⇔ドメイン マッピング純関数**（`problemToRow` 等）は往復テスト済み。null↔undefined 変換も妥当。
34. 📋 **`answer_logs.problem_id` を常に null 保存**（`SupabaseAnswerLogStore.append`）。
    `AnswerLog` に任意 `problemId` を足し、問題単位の集計に備えるのを推奨（型が広域のため別PR）。
35. ✓ **RLS 設計**（公開は published のみ read、所有データは `auth.uid()`、UPDATE は SELECT ポリシーと対）は堅牢。
36. ✓ **`updated_at` トリガ**（0002 migration）と関数の `search_path` 固定は妥当。
37. ✓ **インメモリ実装**（既定）でロジックを実DBなしにE2Eテストできる抽象は良い設計。
38. 📋 **file-store の同時プロセス書き込み**は rename で単発は安全化したが、read-modify-write の競合は残る。
    小規模運用想定のため許容、需要が出れば file lock を推奨。
39. ✓ **`fileStores(dir)` ヘルパ**で3ストアをまとめて生成、テストの一時ディレクトリ運用も妥当。
40. ✓ **byUser の order 指定**（`answered_at` 昇順）で順不同依存を排除済み。

## E. 投稿パイプライン
41. ✓ **公開ゲートの fail-closed**（`publish.ts`）。`retracted`・検証4項目未充足を投稿前に拒否（安全ホール是正済み）。
42. ✓ **X 重み付き文字数**（CJK=2）と**スレッド分割**（`xlength.ts`）。ハード分割で必ず≤280に収める不変条件を保持。
43. ✓ **本文に URL を入れない**チェック（`containsUrl`）と出典フッター必須は compliance と整合。
44. ✓ **朝 poll 併設・夜は朝を引用**（集計の一次ソース化＋ツリー化）は設計通り。
45. ✓ **予約時刻のジッター**（±分）で機械的連投を回避。
46. 📋 **スレッド連番サフィックス予算が固定8**。`(i/n)` は n<100 で安全だが、超長スレッドの理論的桁あふれに備え
    動的予算化を推奨（1クイズで100超は非現実的のため低優先）。
47. ✓ **文面テンプレを複数からランダム選択**（毎回同一を避け凍結回避）。
48. ✓ **numeric は poll なし**（X poll は最大4択・選択肢なし問題に poll を作らない）分岐は妥当。
49. ✓ **既定は下書きエクスポート**（`DraftExportClient`）。実投稿は認証後にアダプタ差替の境界設計。export() もテスト追加。
50. 📋 **絵文字 ZWJ シーケンスの重み**は厳密な twitter-text と差異あり（各コードポイント2換算）。本文は絵文字が少なく
    実害は小。厳密一致が要るなら twitter-text 準拠ライブラリ採用を推奨。

## F. 集計・分析
51. ✅ **週次レビューの TOP/FLOP 重複**（`weekly-review.ts`）。投稿<6で同じ投稿が両セクションに出る。
    → ランキング後 TOP を除いた下位を FLOP に（重複排除・対象なし表示）。
52. ✓ **追う指標を3つに限定**（保存/リプ往復/フォロー転換）・4週移動平均・判断は人間（自動実行しない）は妥当。
53. ✓ **集計の一次ソースは poll**（リプ番号解析は補助）。難易度は「提案」に留め自動上書きしない。
54. ✓ **`applyStats` がスキーマ範囲（answered≥0, rate∈[0,1]）にクランプ**して返すのは安全。
55. 📋 **`aggregate` の votes/choices 長不一致**は未ガード（システム内部入力のため低リスク）。防御的に min 長で集計するのを推奨。
56. ✓ **UTM 生成 `withUtm`**（既存クエリ保持）と `parseUtm` の往復は妥当。本文に貼らない注意書きも整合。
57. ✓ **最頻誤答は正解以外の最多票**。全票0なら null を返す分岐も妥当。
58. ✓ **難易度提案 `suggestDifficulty`**（正答率→★）の閾値設計は妥当。
59. 📋 **誤り訂正 `classify` のヒューリスティック閾値0.5**は固定。実データで再較正できるよう係数を外出しするのを推奨。
60. ✓ **訂正下書きは「消さない・指摘者クレジット・人間承認」**の方針をコード化（荒らし悪用防止）。

## G. セキュリティ・コンプラ
61. ✅ **シェアカードの PII 流出**（`card-text.ts`）。`hasPii` が単体テストのみで本体に未配線。
    → `cardText` に**メール/電話の混入を拒否**するチェックを配線。
62. ✓ **URL を本文に入れない**チェックはシェアカード・投稿で一貫。
63. ✓ **秘密情報の非コミット**（`.gitignore` の `.env*`、gitleaks の secrets-scan、SECURITY.md）は整備済み。
64. ✓ **出典・著作権**（original 主軸／改題は citation 必須／過去問は quoted で分離）はスキーマと ingest で担保。
65. ✓ **デュアルライセンス**（コード MIT／データ・docs CC-BY-SA）と LICENSES 明記は妥当。
66. ✅ **CI の最小権限**を維持しつつ、checkout に **`persist-credentials: false`** を追加（read-only ジョブの資格情報漏洩面を縮小）。
67. ✓ **Supabase anon からの書き込み不可**（RLS）・サービスロール限定の方針は妥当。
68. 📋 **`@anthropic-ai/sdk` の動的 import**で API 不使用経路の読み込みを回避。鍵未設定時のフォールバックは安全側（数値はコード算出）。
69. ✓ **XSS 対策**（`web/src/app.ts` の `escapeHtml` で解説/出典をエスケープ、選択肢は textContent）は妥当。
70. 📋 **依存の整合性**（lockfile・`npm ci`・Dependabot・dependency-review high）は整備済み。`fail-on-severity` を moderate に厳格化する選択肢を提示。

## H. テスト・カバレッジ
71. ✅ **narrate.ts**（22%→）。Stub/Corrupting/`toNarrationInput`/`defaultNarrator`(env切替)/Anthropic コンストラクタをテスト。
72. ✅ **cli.ts**（0%→）。`parseArgs`/`argErrors`/`makeRng`（決定論再現）をテスト。
73. ✅ **supabase-store.ts**（8%→93%）。疑似クライアントで3ストア＋error 伝播。
74. ✅ **fsrs.ts**。again/hard/easy の全採点と view 射影をテスト。
75. ✅ **x-client.ts**。`DraftExportClient` の schedule/連番/export をテスト。
76. ✅ **validate.ts**。`narrationMatchesAnswer` の正/負（数値・非数値）をテスト。
77. ✅ **回帰防止フロアの引き上げ**（`vitest.config.ts`）。stmts75→85 / branch65→76 / funcs80→92 / lines80→89。
78. ✅ **web の採点・JST 境界**の新規テスト（`tests/web/grade.test.ts`、store のJST境界）。
79. ✓ **テストは `tests/` に 1:1 ミラー**配置の規約を踏襲（新規 `tests/clients/` も同様）。
80. 📋 **テンプレートの property-based テスト**（多数 seed で全件 clean/valid）を各テンプレに広げるのを推奨（現状は3相のみ100問）。

## I. CI・ツール・サプライチェーン
81. ✅ **`actions/checkout` のバージョン不統一**（v4 と v6 混在）を **v6 に統一**。
82. ✅ **`timeout-minutes` 欠落**（validate/dependency-review/deploy）を補完（暴走ジョブの上限）。
83. ✓ **concurrency による二重起動抑制**（push/PR）は各ワークフローで設定済み。
84. ✓ **`setup-node` の npm キャッシュ**・`.nvmrc`・`npm ci` は再現性確保で妥当。
85. ✓ **Pages デプロイの直列化**（`concurrency: pages, cancel-in-progress: false`）は妥当。
86. 📋 **Actions の SHA ピン留め**（タグ→commit SHA）は供給網をさらに固められる。Dependabot 運用と相談のうえ推奨。
87. ✓ **`verify` スクリプト**が CI 手順と同一（lint→typecheck→typecheck:web→validate→test→build）で DRY。
88. 📋 **CodeQL/SAST** の追加は将来の選択肢（現状は規模的に過剰の可能性、判断は運用者）。
89. ✓ **PR/Issue テンプレート・CODEOWNERS・dependabot.yml** は整備済み。
90. 📋 **カバレッジレポートの artifact 化/PR コメント**は可視化に有効（任意）。

## J. ドキュメント・DX
91. ✅ **本監査ドキュメント**（このファイル）。100項目の根本原因と対応状況を一覧化＝「品質に本気」の可視化資産。
92. ✅ **CHANGELOG の Unreleased 更新**（Fixed/Added/Changed を本PR分追記）。
93. ✓ **architecture.md / lib/README.md** の依存グラフ・責務索引・設計不変条件は最新で有用。
94. ✓ **README の使い方・絶対原則・公開手順**は実コマンドと整合（`gen --help` を追加したので導線も改善）。
95. ✓ **CONTRIBUTING の PRチェックリスト**（lint/typecheck/test/validate）は CI と一致。
96. 📋 **`docs/strategy/human-tasks.md`** に「認証取得後に差し替えるアダプタ一覧」を集約済み。実装側 TODO と相互リンク強化を推奨。
97. ✓ **editorconfig / biome / gitattributes** の整形・LF 正規化・linguist マーキングは整備済み。
98. 📋 **エラーメッセージの一貫性**（日本語・接頭辞）。CLI の `argErrors` で統一様式を導入。横展開を推奨。
99. ✓ **コメントの密度と日本語の語り口**は既存コードに合わせて統一（本PRの追加分も踏襲）。
100. 📋 **「品質基準」1枚の公開**（`04-100point-fixes.md` #100）と本監査をリンクし、検証プロセス自体を発信資産化するのを推奨。

---

### 本PRで実装した主因（要約）
- **採点の正しさ**（numeric 数値比較・JST ストリーク）= 学習者が直に触れる体験の事故を止める。
- **生成エンジンの堅牢化**（CLI 検証・直接実行限定・テンプレ整形）= 誤操作と無言失敗を排除。
- **永続化/集計の防御**（file 原子書き込み・週次重複・PII 拒否・export 検証）= データと発信の信頼。
- **テスト網の拡張**（narrate/cli/supabase/fsrs/x-client/validate ＋ フロア引き上げ）= 回帰の自動防止。
- **CI 堅牢化**（版統一・timeout・最小資格情報）= 供給網と実行の安全余白。

設計の根幹（反ハルシネーション・検証ゲート・依存の一方向）は妥当と確認し、温存した。
残りの 📋 推奨は人間判断（監修・収益化・運用較正）か広域型変更で、別PRに分割するのが安全。
