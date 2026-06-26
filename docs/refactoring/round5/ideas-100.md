# 第5ラウンド 深掘り調査100 — 候補カタログとトリアージ（2026-06-26）

3系統の並列深掘り監査（lib / web / tests・CI・data・docs）＋実コード検証で抽出・確認した候補を分類する。
凡例: **✅実装** = 検証済み・不変条件を壊さず実装 / **非問題** = 誤報・既対応・設計通り / **見送り** = byte/挙動リスク or 低価値churn。

> 重要: 本ラウンドの規律は「各候補を**実コードで検証**してから分類する」こと。実検証で**複数の指摘が誤報**と判明した
> （該当行に「検証:」で根拠を記す）。「調査して非問題と確定するのも正当な成果」（第3ラウンド方針の踏襲）。

## A. 検証ゲート・テストの実効性（tests / CI）

| ID | 内容 | 判定 |
|----|------|------|
| I5-001 | `validate-problems.ts` 下限ゲートを純関数 `minFilesGate` へ抽出し失敗パス（51件で fail）を明示テスト | ✅実装 |
| I5-002 | `EXPECTED_MIN_FILES` を export し「実データ52件と一致」を回帰ピン（閾値だけ下げて偽グリーン化を防止） | ✅実装 |
| I5-003 | `minFilesGate(0)`（全削除）を確実に弾くテスト | ✅実装 |
| I5-004 | ajv⇄zod ドリフト: 空文字 id/topic/statement/answer を両系で拒否するテスト追加 | ✅実装 |
| I5-005 | ajv⇄zod ドリフト: 空 solution 配列を両系で拒否するテスト追加 | ✅実装 |
| I5-006 | RLS 0005 列ガード（topic 非空 WITH CHECK）の純関数モデル＋4観点テスト追加 | ✅実装 |
| I5-007 | `toXPost.test.ts:16` の `morning.length >= 1` 弱アサーション | 非問題: 直後の content 一致（`toContain("3.2")`）が空配列を弾く＝偽グリーンでない。厳密件数化は frozen fixture 整形変更に脆く逆効果 |
| I5-008 | `publish.test.ts:51-52` の `>= 1` | 非問題: 直後の `drafts[0]`/`morning[0].id` 参照が空なら throw＝下流で保護済み |
| I5-009 | 0004 マイグレ回帰テストが正規表現 `search` 依存（splitStatements 未使用） | 見送り: 静的SQLで機能・低価値。共有ヘルパー抽出は別テスト改変の結合を生む |
| I5-010 | EXPECTED_MIN_FILES のファズ（51.999 等） | 非問題: `files.length` は `readdirSync` 由来の整数。非整数は構造上ありえない |
| I5-011 | カバレッジ閾値のメタテスト（config を JSON parse して下限検証） | 見送り: vitest が実行時に強制済み。TS config の parse は過剰設計 |
| I5-012 | RLS モック/統合が本番と乖離（偽グリーン） | 非問題（第3T-A5既述）: モックの本質的限界。0005列ガードのモデル化（I5-006）で実効を補強 |
| I5-013 | `schema-drift.test.ts` の files 下限（>=52）は I5-001 とCI二重化で担保 | 非問題: 既に `>= 52` 化済み（第3T-A1）。本ラウンドで CI 側も pure 関数化 |
| I5-014 | テストの過度な `!`（noNonNullAssertion off） | 見送り（第3D-6）: 第1G9で意図的に緩和（expect→! イディオム）。方針維持 |
| I5-015 | fake-timers/ファズ/統合テストの拡充余地 | 調査: RG7で整備済み。新規の高価値ケースは見当たらず低優先 |

## B. スキーマ・型の表現力

| ID | 内容 | 判定 |
|----|------|------|
| I5-016 | ajv `problem-schema.json` に `minLength:1`（id/topic/statement/answer）を追加し zod と parity | ✅実装 |
| I5-017 | ajv に `minItems:1`（solution）を追加し zod `.array().min(1)` と parity | ✅実装 |
| I5-018 | `problem_id` 空文字受理（第3T-C3） | 非問題: 問題スキーマに `problem_id` は無く（`id`）、`id` は zod `.min(1)`＋本ラウンドで ajv も minLength:1。supabase 側は別途 `.min(1).nullable()` 済み |
| I5-019 | source discriminated union の網羅性 | 調査: RG2で実装済み。past_exam_* の citation 必須は ajv allOf＋zod refine の両系で担保 |
| I5-020 | choices の ajv minItems:2（MC）と zod refine の parity | 非問題: ajv allOf に minItems:2、zod は MC refine で担保。空文字要素は別問題（buildChoices 正規化済み） |
| I5-021 | params.value の有限性（NaN/Infinity 拒否） | 調査: 生成側 clean/constrainRange で担保。schema 追加は低優先 |
| I5-022 | optional 濫用の見直し | 調査: RG2で discriminated union 化済み。残りは設計上の任意フィールド |
| I5-023 | zod 自動生成（ajv からの single source） | 見送り（第3D-5）: 大規模インフラ変更。ドリフトテスト（I5-004/016）で実用担保 |

## C. lib エンジン（生成・検証・図・xpost・CLI）

| ID | 内容 | 判定 |
|----|------|------|
| I5-024 | `checkParamsConsistency` を generateOneDetailed で強制 reject | 見送り: **problems.json byte risk:high**（採用draw変化）。テスト配線（generate.ts:241）で検出は担保。理論懸念に留まる |
| I5-025 | aggregate 最頻誤答が同票で非決定的 | 非問題: 検証: `v > maxWrong`（厳密大なり）で**最小index決定的**（第3N-/T-C5と一致）。誤報 |
| I5-026 | clean.ts epsilon 相対化・整数チェック緩和 | 見送り（第3D-1）: 採用drawが変わり problems.json バイト変化。決定論保証を壊す |
| I5-027 | buildChoices 浮動小数 dedup・空文字ガード | 見送り（第3D-2）: 入力は formatClean 正規化済みで発火せず。変更は byte リスク |
| I5-028 | ANSWER_EPSILON_BY_UNIT 導入 | 見送り（第3D-4）: 過剰設計。現行 1e-6 で全テンプレ健全 |
| I5-029 | `pick()` の空配列エラーにラベル付与 | 見送り: 低価値。発火時は問題破棄で吸収。helpers は100+テンプレが依存しチャーン面が広い |
| I5-030 | figures の重複 `loopFrame` | 非問題: **第4ラウンドで解消済み**（primitives.loopFrame へ配線） |
| I5-031 | svgLabel/fmt の用途分離 | 非問題: II-128 で公開エイリアス＋誤用注意済み |
| I5-032 | CLI 段階別エラー・--help・--version | 非問題: RG3で実装済み（-t/-v/--xpost-limit/--xpost-out） |
| I5-033 | narrate フォールバック率の観測性 | 非問題: RG2 telemetryフック＋NARR-01（既定でログ）実装済み |
| I5-034 | 生成歩留まり・rejection_reason の可視化 | 非問題: RG2で attemptsUsed/rejection_reason 実装済み |
| I5-035 | テンプレ defineTemplate 移行の完遂 | 非問題: RG1で全テンプレ移行＋物理制約ヘルパー一元化済み |
| I5-036 | xpost CHOICE_MARKS の重複定義 | 非問題: **第4ラウンドで lib/shared/choices.ts に集約済み** |
| I5-037 | xlength 重み付き280字スレッド分割の境界 | 調査: テスト済み・設計通り。日本語=2カウントの境界は xlength.test で担保 |
| I5-038 | gate.ts meetsValidationGate の三重化 | 見送り（第2eng-2再掲）: schema→gate の runtime import 方向反転。型のみ依存で実害なし、配線変更は低価値 |

## D. lib サービス（scheduler / store / chat / aggregate / notify / ingest）

| ID | 内容 | 判定 |
|----|------|------|
| I5-039 | supabase `rowToReviewState` の `new Date(due_at).getTime()` が NaN 化しうる | 見送り: zod `.datetime()` で事前検証済み。多層防御の追加は低価値（理論エッジ） |
| I5-040 | supabase lenient モードが構造欠落と値不正を混同 | 見送り: 第3で lenient 時 `console.warn` 必須化済み（supabase-store.ts）。細分化は低価値・警告文言の回帰リスク |
| I5-041 | FSRS init が createdAtMs 未設定（SM-2 と非対称） | 見送り: メタデータの軽微な非対称。両系とも機能。scheduler 状態に触れるリスク>価値 |
| I5-042 | diagnosis weaknessScore: attempts=0＋大overdue が中優先化 | 見送り: **挙動変更**（弱点TOP5の順位が変わる）。現行は overdue 30日クランプで防御済み |
| I5-043 | notify parseHHMM 無効値の観測性フック | 見送り: 既に `console.warn`（第3T-C2）。コールバック追加は API 面拡大・低価値 |
| I5-044 | ingest 年号の意味的妥当性（昭和等の古さ） | 見送り: フォーマット検証は enum/正規表現で十分。年代フィルタは仕様外 |
| I5-045 | chat 知識検索（日本語バイグラム）の品質 | 非問題: RG4で parseCitation/KNOWLEDGE_META 整備。retrieve はテスト済み |
| I5-046 | scheduler SM-2 interval 上限 cap | 見送り（第3D-3）: ease暴走監視 II-130 実装済み。cap は挙動変更＋データ移行影響 |
| I5-047 | supabase 日付の TZ（UTC保存） | 非問題（第3D-8）: zod `.datetime()` 検証＋設計通り UTC |
| I5-048 | aggregate movingAverage の少データ時表示 | 見送り: 出力文言の挙動変更。現行プレースホルダで実害なし |
| I5-049 | store retrieve のメモ化/世代カウンタ | 非問題: 第3T-B1でキャッシュ世代カウンタ実装済み |
| I5-050 | community/correction/crosspost の重複ロジック | 調査: RG4後で凝集。repurpose の4要素マーク変種は意図的（第4で温存） |

## E. web 状態・ロジック（非view）

| ID | 内容 | 判定 |
|----|------|------|
| I5-051 | `grade.ts` 末尾 `.trim()` が `\s+` 全除去後の no-op | ✅実装（削除・出力バイト同一） |
| I5-052 | 設定 goal 入力欄がクランプ後値へ再同期しない（cap は同期済み） | ✅実装（capInput と挙動統一・保存値は不変） |
| I5-053 | settings setter が範囲外を localStorage に通す | 非問題: 検証: setDailyGoal/setReviewCap とも `Math.min/max` でクランプ済み |
| I5-054 | dueCountCached のキー衝突（複数タブ・同分・同長） | 見送り: 極稀・実害限定。content hash 化はコスト>価値。書込時 invalidate は実装済み |
| I5-055 | xpByDayCached のキーに dayOffsetMs | 非問題: 検証: キーに dayOffsetMs 含む＝TZ変化で正しく失効。コメント補足は低優先 |
| I5-056 | BACKUP_KEYS が denken:sound を欠落 | 非問題: 検証: **存在済み**（backup.ts:42）。誤報 |
| I5-057 | backup 復元で chatModel を CHAT_MODELS 照合せず | 見送り: getChatModel が不正値を既定にフォールバック済み。厳格化は版差バックアップを誤拒否しうる |
| I5-058 | setExamDate のキャッシュ無効化が暗黙 | 非問題: 検証: setter 内で `_dueCountCache=null` を常時実行済み |
| I5-059 | XP/レベル/称号の導出純粋性 | 非問題: 解答ログから完全導出・テスト済み（RG5メモ化） |
| I5-060 | streak/freeze お守りの境界（欠席カバー） | 非問題: freeze.test で網羅。第3で streak 計算は決定論確認済み |
| I5-061 | achievements 遡及判定のメモ化整合 | 非問題: evaluateAchievementsCached＋世代カウンタ（第3T-B1） |
| I5-062 | fsrs.ts 目標保持率の反映 | 非問題: retention.ts＋設定連動。RG実装済み |
| I5-063 | normalizeNumericInput の全角/区切り正規化網羅 | 調査: grade.test で網羅。.trim 削除後も全テスト緑（I5-051で確認） |
| I5-064 | store streak-walk の4箇所差異の共通化 | 見送り: 各サイトで意味が異なり（studied/covered/state/dayIndex）抽象は leaky・短縮効果薄 |
| I5-065 | mascot 正modulo の mod ヘルパー | 見送り: 1行式・near-zero価値のチャーン |

## F. web view・a11y・PWA

| ID | 内容 | 判定 |
|----|------|------|
| I5-066 | 数値回答 input の aria ラベル欠落 | 非問題: 検証: 既に `aria-label="数値の答え"`（practice.ts:501）。誤報 |
| I5-067 | 記述採点チェックボックスの aria ラベル | 非問題: 検証: `<label for=rbN>` で step text とプログラム的に関連付け済み。aria-label 付与は可視ラベルを上書きし逆効果 |
| I5-068 | per-view エラー境界 | 非問題: RG6で renderViewSafe 実装済み（記録保持して復旧） |
| I5-069 | aria-live トースト・全画面読み上げ | 非問題: RG6で aria-live・SR通知実装済み |
| I5-070 | exam タイマーリーク | 非問題: RG6で clearExamTimer・可視性ハンドラ実装済み |
| I5-071 | SafeHtml branded type による innerHTML ガード | 非問題: RG6で実装。formatAssistant は renderMarkdown でエスケープ |
| I5-072 | チャットストリームの HTML インジェクション境界 | 調査: renderMarkdown がエスケープ・SafeHtml で型ガード。XSS テスト追加は将来余地（低優先） |
| I5-073 | キーボード Tab トラップの動的要素対応 | 非問題: 検証: ダイアログ内容は静的。動的更新は発生せず実害なし |
| I5-074 | clearExamTimer の多重呼び出しガード | 非問題: `timerId != null` チェックで冪等。boolean 返却は不要なAPI拡大 |
| I5-075 | 設定フォームの submit ボタン無し（自動保存） | 非問題（cosmetic）: 意図的UX。再同期（I5-052）で実態反映を強化 |
| I5-076 | トースト絵文字の SR 冗長読み上げ | 非問題（cosmetic）: 実害限定。aria-hidden は文脈次第で情報欠落 |
| I5-077 | mascot SVG の role | 非問題（cosmetic）: 視覚フォールバック動作・装飾的 |

## G. ドキュメント・CI・セキュリティ・データ

| ID | 内容 | 判定 |
|----|------|------|
| I5-078 | 第3 triage の閾値主張（86/77）と実体（84/76）のドリフト | ✅実装（訂正注記を追加・現フロア方針を正とする） |
| I5-079 | PR テンプレに必須/任意CIの区別が無い（e2e 非ブロッキング） | ✅実装（CI 必須・任意の節を追加） |
| I5-080 | PR テンプレ不在 | 非問題: 検証: 既に `.github/PULL_REQUEST_TEMPLATE.md` 存在 |
| I5-081 | `.gitleaksignore` の行コメント不足 | 非問題: 冒頭ブロックコメントで全エントリ説明済み（行単位は冗長） |
| I5-082 | codeql workflow の権限 | 非問題: 検証: contents:read＋必要権限明示済み |
| I5-083 | dependency-review の権限明示 | 非問題（第3T-D2）: 既に permissions 明示済み |
| I5-084 | `.env.example` の .gitignore 同期注意 | 非問題（第3T-D4）: [SECRET]/[CONFIG]分類＋言及済み |
| I5-085 | SECURITY.md の将来バンドラ移行注記 | 見送り: 現構成（esbuild postinstall）は健全。投機的・低価値 |
| I5-086 | SLSA provenance / artifact attestation | 見送り: サプライチェーン最前線・現スコープ外 |
| I5-087 | RLS 0005 列ガードの DDL 正当性 | 非問題: 同名ポリシー置換＋revert ガイド付き（多層防御）。I5-006でモデル化 |
| I5-088 | migration version table | 見送り（第3D-5）: 大規模インフラ。schema-drift＋下限ゲートで実用担保 |
| I5-089 | npm audit を critical→high 据え置き | 見送り（第3D-7）: high の方が広く検出（厳しい）。現状維持が安全側 |
| I5-090 | tsconfig*.json の厳格性 | 非問題: 第1G9で noImplicitReturns/noFallthroughCases/exactOptionalPropertyTypes 追加済み。再確認で適合 |

## H. 第1・2ラウンド見送りの再評価

| ID | 内容 | 判定 |
|----|------|------|
| I5-091 | I-050/051/052（第1見送り） | 見送り維持: 当時の理由（投機的/byte リスク）が現在も妥当 |
| I5-092 | I-089/092（第1見送り） | 見送り維持: 同上 |
| I5-093 | II 系（第2）の見送り項目 | 非問題/見送り維持: RG1–RG8 で主要項目は実装済み・残りは byte/挙動リスク |
| I5-094 | sw.js CACHE 版数の手動運用 | 非問題: RG7で build:web 自動版数化済み |
| I5-095 | CSP/SRI 不在 | 非問題: RG7で CSP/SRI 追加・build:web が SRI 自動注入 |

## I. 文言・整形・cosmetic（実装見送り＝チャーン回避）

| ID | 内容 | 判定 |
|----|------|------|
| I5-096 | import エイリアス改名 | 見送り: cosmetic・near-zero価値 |
| I5-097 | 文字列ソート比較子の明示 locale | 見送り: 現行で安定・低価値 |
| I5-098 | review-cap 定数の共有 | 見送り: 意図的に分離した settings/retention 間に依存辺を増やす |
| I5-099 | publish.ts 朝/夜ループの統合 | 見送り: scheduledAt/初回付加/エラーラベルが異なり、現状の明示形が可読。抽象は indirection 増 |
| I5-100 | CI workflow preamble の composite action 化 | 見送り: cache-key/checkout ref/権限が workflow 毎に異なり、共通化は CI 挙動を変えるリスク |

## 集計

調査100候補 → **✅実装 13**（I5-001〜006, 016〜017, 051〜052, 078〜079 ＝ 検証ゲート/スキーマparity/RLSテスト/web整合/lib整理/docs）、
**非問題（誤報・既対応・設計通り）約42**、**見送り（byte/挙動リスク or 低価値）約45**。

第5ラウンドの収穫は件数ではなく、**(1) ajv⇄zod のスキーマ parity ドリフトを是正し空値を両系で塞いだこと**、
**(2) 下限ゲートを pure 関数化して失敗パスを機械的にテストできるようにしたこと**、
**(3) RLS 0005 列ガードをモデル化してカバレッジを補強したこと**、そして
**(4) 監査指摘の誤報を実コード検証で却下し、ドキュメントのドリフトを訂正したこと**。
全実装は **problems.json バイト不変・挙動不変・全テスト緑** を維持する。
