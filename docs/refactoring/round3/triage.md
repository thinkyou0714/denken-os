# 第3ラウンド: 堅牢化/正当性監査トリアージ（2026-06-15）

第1・第2ラウンド（計200項目, PR #33/#35/#36）＋Codex外部レビュー4件の後、
**外部レビューが内部監査の見逃した実バグを4件検出した**事実を受け、磨き込みではなく
**実際の欠陥を敵対的に狩る**3系統監査（web実挙動・エンジン/ドメイン・データ/CI偽グリーン）を実施した。

## 根本原因（なぜCodexが内部監査の穴を突けたか）

| # | 根本原因 | 対応 |
|---|---------|------|
| RT1 | **検証ゲートが緩く回帰を通す**（テストの偽グリーン: `>= 1`・no-op assertion、下限ゲート欠如）→ データ削除や検証退行を機械的に止められない | T-A |
| RT2 | **メモ化キャッシュのキーが内容変化を取りこぼす**（length+末尾atMsのみ）→ バックアップ復元等で古い集計を返す | T-B |
| RT3 | **入力の物理的妥当性を信頼しすぎ**（weaknessScore負値・jitterのRNG範囲・parseHHMM無効値の無音吸収・空文字problem_id） | T-C |
| RT4 | **RLSがrow所有のみで列内容を検証しない**／CI権限・閾値の緩み | T-D |

## トリアージ方針（重要）

200項目＋Codex修正後、コードベースは良好で第3ラウンドは逓減局面。
**100案を盲目的に全実装せず、各findingを厳密に調査し3分類**した:
1. **実装**（確認済み・決定論安全＝problems.jsonバイト不変を壊さない）
2. **非問題**（誤報・JS仕様の誤解・型で既に防御済み・実害なし）
3. **見送り**（決定論リスク＝clean.ts/テンプレ数値変更でproblems.jsonが変わる、または投機的）

「調査して非問題と判断する」のも深掘り調査の正当な成果である。

---

## T-A: 偽グリーン是正・検証ゲート強化（RT1）★最重要

| ID | 監査 | 内容 | 判定 |
|----|------|------|------|
| T-A1 | data#6 | `schema-drift.test.ts` の `files.length >= 1` → `>= 52`（データ削除を検知） | 実装 |
| T-A2 | data#13 | `validate-problems.ts` に下限ゲート（`files.length < EXPECTED_MIN` でexit） | 実装 |
| T-A3 | data#7 | `generate-from-roundtrip` の KNOWN_DIVERGENT を「報告のみ」→「空であることをassert」 | 実装 |
| T-A4 | data#15 | カバレッジ閾値を実測に追従して床上げ（statements 85→86, branches 76→77） | 実装 |
| T-A5 | data#5/#9/#10 | RLSモック/統合テストが本番と乖離（偽グリーン） | 見送り: モックの本質的限界。実DB統合は環境依存で別途。コメントで限界を明記(T-A6) |
| T-A6 | data#10 | supabase-store の検証失敗が監視不能 | 実装: lenientスキップ時にconsole.warnを必須化 |

## T-B: キャッシュキー堅牢化（RT2）

| ID | 監査 | 内容 | 判定 |
|----|------|------|------|
| T-B1 | web#RG3-001/002 | `byTopicCached`/`xpByDayCached`/`evaluateAchievementsCached` のキャッシュが内容変化を取りこぼす。ログは追記専用だが**バックアップ復元で配列ごと差し替わる**と同lengthで古い結果を返す → 各キャッシュに「ストア世代カウンタ」を加える or import時にclearする | 実装 |

## T-C: 入力妥当性ガード（RT3・runtime限定で決定論安全）

| ID | 監査 | 内容 | 判定 |
|----|------|------|------|
| T-C1 | engine#205 | `weaknessScore` が負のattempts/未来dueで異常値 → 冒頭でクランプ | 実装 |
| T-C2 | engine#206 | `parseHHMM` が無効時刻("25:00")を無音で既定に吸収 → console.warn | 実装 |
| T-C3 | engine#207 | supabase `problem_id` が空文字を受理 → zodで `.min(1).nullable()` | 実装 |
| T-C4 | engine#221 | `jitter` がRNG[0,1)逸脱で負時刻 → クランプ | 実装 |
| T-C5 | engine#212 | `aggregate` の最頻誤答が同票時に非決定的 → tie-breakを明示（最小index固定） | 実装 |

## T-D: RLS列検証・CI堅牢化（RT4・決定論無関係）

| ID | 監査 | 内容 | 判定 |
|----|------|------|------|
| T-D1 | data#1/#2 | RLS INSERT の WITH CHECK が所有者のみ → `topic IS NOT NULL` 等を追加（新規 migration 0005） | 実装 |
| T-D2 | data#18 | `dependency-review.yml` に明示 permissions | 実装 |
| T-D3 | data#29 | `.gitleaksignore` の各行に理由コメント | 実装 |
| T-D4 | data#28 | `.env.example` に .gitignore 同期の注意書き | 実装 |

## 非問題（誤報・調査の結果バグでないと確認）

| ID | 監査 | なぜ非問題か |
|----|------|-------------|
| N-1 | engine#227 | `checkParamsConsistency` は未使用ではない（generate.ts:241で配線・テストあり）。**誤報** |
| N-2 | web#RG3-005 | 「タイマー代入途中のclear競合」はJSが単一スレッドのため発生しない。**JS仕様の誤解** |
| N-3 | data#3/#4 | SRI/SW版数の不整合は無い（実app.jsとSRI一致を確認、SW版数はproblems.json変更で変化を実証）。**誤報（過渡状態を読んだ）** |
| N-4 | engine#225 | ingest subject の空白は enum 型で既に防御済み。**冗長指摘** |
| N-5 | engine#236/#224/#226/#228/#230/#235 | JSDoc明記済み/既知TODO(II-131等)/タイムゾーン設計通り。**実害なし** |
| N-6 | web#RG3-007/011/012 | $()のnull許容・render再描画は既存の意図的設計（per-view境界で捕捉）。低優先で実害限定 |

## 見送り（決定論リスク or 投機的）

| ID | 監査 | 見送り理由 |
|----|------|-----------|
| D-1 | engine#202/#211/#214/#218/#232 | clean.ts/テンプレの数値判定（isCleanAnswer負値・epsilon相対化・整数チェック緩和）を変えると**採用drawが変化しproblems.jsonのバイト列が変わる**。2ラウンド維持した決定論保証を壊すため見送り。現状全テンプレは正しく生成できており理論上の懸念に留まる |
| D-2 | engine#201/#223 | buildChoices浮動小数dedup/空文字ガード: 入力は`formatClean`正規化済みで発火しない。変更はproblems.jsonリスク |
| D-3 | engine#234 | SM-2 interval上限: ease暴走監視は実装済み(II-130)。上限capは挙動変更でデータ移行影響 |
| D-4 | engine#23(#3) | ANSWER_EPSILON_BY_UNIT: 過剰設計。現行1e-6で全テンプレ健全 |
| D-5 | data#19/#32 | zod自動生成/migration version table: 大規模インフラ変更。schema-driftテスト(T-A1強化)で実用上担保 |
| D-6 | data#16 | tests の noNonNullAssertion off 解除: 第1ラウンドG9で意図的に緩和済み(expect→!イディオム190件) |
| D-7 | data#30 | npm audit を critical→high据え置き: highの方が広く検出（厳しい）。現状維持が安全側 |
| D-8 | engine#208/#235 | supabase日付/TZ: zod .datetime()で検証済み、設計通りUTC保存 |

## 実装後に非問題と判明した項目（より深い確認で却下）

| ID | なぜ非問題か |
|----|-------------|
| T-A6 | supabase lenient skip は**既に `console.warn` 実装済み**（supabase-store.ts:245-249）。audit#10 誤報 |
| T-C5 | aggregate 最頻誤答は `v > maxWrong`（厳密大なり）で**最小indexが決定論的に選ばれ既に正しい**。audit#212 誤報 |
| T-D2 | dependency-review.yml は**既に permissions 明示済み**（contents:read, pull-requests:read）。audit#18 誤報 |
| T-D3/T-D4 | `.gitleaksignore` は冒頭コメントで全エントリ説明済み、`.env.example` は [SECRET]/[CONFIG] 分類＋.gitignore言及済み（第2ラウンドで対応）。audit#29/#28 既済 |

## 集計

調査100+件（web18 / engine36 / data31 ＋ Codex4）→ **実装10項目**
（T-A1〜A4: 偽グリーン/下限ゲート4 / T-B1: キャッシュ堅牢化1 / T-C1〜C4: 入力ガード4 / T-D1: RLS列検証1）、
**確認の結果 非問題16・誤報5・見送り8系統**。

第3ラウンドの最大の収穫は項目数ではなく、**「偽グリーンテスト（>=1・no-op assertion）と下限ゲート欠如」という、
Codexが私の監査を出し抜けた根本原因（RT1）を是正した**こと。これにより今後のデータ削除・検証退行・
再現性不一致を機械的に止められる。全実装は**problems.jsonバイト不変**を維持（runtime/test/CI/migrationのみ）。
</content>
