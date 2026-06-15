# 改善アイデアカタログ 第2ラウンド（II-101〜II-200）

3系統の深掘り監査（ドメイン/エンジン・web性能/a11y・テスト/CI/データ/セキュリティ）から
第1ラウンド（[../ideas-100.md](../ideas-100.md), I-001〜I-100）と重複しない新規100項目を抽出・統合した。
「対応」列は実装タスク（[plan.md](./plan.md) のRG1〜RG8）または見送り理由。
★★★=構造的/正当性/安全性, ★★=品質/堅牢性, ★=磨き込み。

## A. テンプレート物理制約・ファクトリ移行（RR1 → RG1）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| II-101 | ★★★ | `defineTemplate`採用が13/87止まり。残り74の手書き`generate`/`generateFrom`委譲を全移行（決定論=problems.jsonバイト一致で担保） | RG1 |
| II-102 | ★★★ | 効率η≤1等の物理上限チェックが各テンプレに散在 → `constrainRange(value,min,max,name)`を共有化 | RG1 |
| II-103 | ★★ | 力率>1検出のtolerance `1e-9`がテンプレ毎にバラバラ → `POWER_FACTOR_TOLERANCE`を`lib/shared/constants.ts`へ集約 | RG1 |
| II-104 | ★★ | `percentage()`等のゼロ割NaNが呼び出し側で`Number.isNaN`チェックされず伝播 → ヘルパーで一貫処理＋ドキュメント | RG1 |
| II-105 | ★ | 丸め誤差で負値化した計算結果の扱いが暗黙（return nullのみ）→ 物理量の非負ガードを共有ヘルパー化 | RG1 |
| II-106 | ★★ | `formatClean`と`formatKW`の丸め仕様差を選択肢生成で混用 → 各々の使い分けをJSDoc明記＋重複検査tolerance | RG1 |
| II-107 | ★ | 選択肢の昇順保証がテンプレ独自sortとbuildChoices混在で崩れうる → buildChoiceへ統一 | RG1 |
| II-108 | ★ | テンプレ定数の`readonly`/`as const`が一部漏れ（第1ラウンドの取りこぼし精査） | RG1 |
| II-109 | ★★ | `Distractor`に`reason`はあるが教育的根拠が未検証 → reason必須化＋拡張用optionalフィールド予約（frequency等） | RG1 |
| II-110 | ★★ | ParamSpecに`required`概念がなく必須パラメータ欠落を型で防げない → ParamSpecに`required`追加しgenerateFromで検証 | RG1 |
| II-111 | ★ | 新規テンプレがdefineTemplateを使わなくてもCIが素通し → レジストリ走査テストで「全テンプレがファクトリ製」を保証（テストはRG7） | RG1/RG7 |
| II-112 | ★ | テンプレ冒頭JSDocが簡潔すぎ物理式導出根拠が追えない → 【シナリオ/導出式/既定params/境界】の定型JSDoc（代表20件＋移行分） | RG1 |

## B. エンジン型表現力・検証深化・観測性（RR2/RR3 → RG2）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| II-113 | ★★★ | `source.citation`がoptionalだが`type!=="original"`時必須。refine実行時検証のみでIDE非対応 → discriminated unionで型化（後方互換） | RG2 |
| II-114 | ★★ | `validateProblem`が構造+不変条件のみ。テンプレの`physicallyValid`とproblem.validationの整合を未検証 → `validatePhysics`追加 | RG2 |
| II-115 | ★★ | 問題セット全体の重複検査がない（同一topic内で酷似paramsの実質重複）→ `validateProblemSet(problems)`新設 | RG2 |
| II-116 | ★★ | `narrationMatchesAnswer`の指数表記対応が実narrate出力でテストされていない → 実出力に対する照合テスト（RG7）＋抽出の取りこぼし監査 | RG2/RG7 |
| II-117 | ★★ | narrateのフォールバック（パース失敗時default）率が不可視 → `telemetry`フックでフォールバック率/原因/モデルを記録可能に | RG2 |
| II-118 | ★★ | `generateOne`の棄却回数（汚いdraw）が不可視で歩留まり劣化に気付けない → `attemptsUsed`を返し累積棄却率をログ可能に | RG2 |
| II-119 | ★★ | `validation`がbool羅列のみで`human_checked=false`の理由が残らない → `rejection_reason?`を追加 | RG2 |
| II-120 | ★ | `minConfidence`既定0（無効）でアプリ層推奨値が不明確 → 既定/推奨をJSDoc明記、テンプレ単位confidence上書きの土台 | RG2 |
| II-121 | ★★ | GenerationResult.paramsとProblem.paramsの同期がない（テンプレ拡張時に手動）→ 逆写像バリデータで整合確認 | RG2 |
| II-122 | ★ | `DEFAULT_NARRATE_MODEL`固定で複雑式の言い換え品質が未検証 → narrateテストに複雑statement追加（RG7）＋モデル選択のJSDoc | RG2/RG7 |
| II-123 | ★ | DistractorのDXは型に依存。schema側にdistractor根拠を残せる余地を予約（II-109と整合） | RG2 |

## C. CLI・図・xpost堅牢化（RR3 → RG3）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| II-124 | ★★ | `cli.ts`の引数パーサがプリミティブで不正引数を黙認（`--topic`直後が空でもスキップ）→ 検証＋短縮形＋不明オプション警告 | RG3 |
| II-125 | ★★ | cli/xpostのエラーが段階（draw/narrate/validate）を区別しない → 段階別catchとログレベル分離 | RG3 |
| II-126 | ★ | xpost出力が無制限でstdout肥大の恐れ → 先頭N件制限＋`--xpost-out`ファイル出力 | RG3 |
| II-127 | ★ | `gen`に`--version`がなくデプロイ後の生成器版数確認不能 → package.jsonから版数出力＋APIレスポンスに埋込 | RG3 |
| II-128 | ★ | `figures/`の局所`fmt()`が誤用防止されていない → SVGラベル専用を明示（export整理＋JSDoc警告強化） | RG3 |
| II-129 | ★ | 図SVG生成の重複（軸/目盛/ラベル）→ 共通プリミティブヘルパーに抽出（挙動=出力SVG不変） | RG3 |

## D. スケジューラ・診断・知識・ストア（RR3/RR4 → RG4）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| II-130 | ★★★ | SM-2 easeの上限なし設計の統計的根拠が未記載＋暴走監視なし → 参照（Wozniak 1990）明記＋ease異常値warning | RG4 |
| II-131 | ★★ | `weaknessScore`の係数(10,1,0.1)が恣意的で根拠/較正テストなし → 根拠JSDoc＋境界値テスト（RG7） | RG4/RG7 |
| II-132 | ★★ | FSRSとSM-2が併存しアプリ層の選択機構が不明 → `getScheduler()`でtype-safe選択＋根拠ドキュメント | RG4 |
| II-133 | ★ | `weakestTopics`のlimit=3固定 → 引数で制御を明示化 | RG4 |
| II-134 | ★★ | aggregateで失われた投票が「どのindexか」不明 → warningに具体index範囲を付与 | RG4 |
| II-135 | ★★ | `knowledge.ts`(799行)の科目セクション境界が目次コメントと一致保証されない → 正確な行範囲注記＋一致検証テスト（RG7） | RG4/RG7 |
| II-136 | ★★ | `retrieve`のDice係数`minScore=0.18`・重み0.7:0.3が経験値で日本語/カナ/英混在精度未検証 → テスト拡充（RG7）＋根拠JSDoc | RG4/RG7 |
| II-137 | ★ | knowledge各エントリの出典テキスト版数が不明 → `lastReviewedAt`等メタで定期レビュー基準化 | RG4 |
| II-138 | ★★ | supabase行のzod検証失敗時にrecovery戦略なし（1件破損で全停止）→ lenientモード＋スキップ記録 | RG4 |
| II-139 | ★ | ingestの`citation`が年度のみ等の不完全出典を検出しない → `parseCitation()`でフォーマット強制 | RG4 |
| II-140 | ★★ | file-store/supabase-storeに並行性/トランザクションの契約記載なし → JSDocで制限明記 | RG4 |
| II-141 | ★ | Card/ReviewStateに`createdAtMs`がなく古いstate誤参照リスク → 生成時刻メタを追加（軽量） | RG4 |
| II-142 | ★ | `weakestTopics`等のlib公開関数のJSDoc/契約補完（観測しやすさ） | RG4 |

## E. Webランタイム性能・状態・チャット（RR4 → RG5）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| II-143 | ★★ | `xpByDay`が毎描画で全ログO(n)集計（上限5000）→ Storeに差分更新キャッシュ | RG5 |
| II-144 | ★★ | `byTopic`が毎描画でMap構築→ソートO(n log n) → マスタリーキャッシュ | RG5 |
| II-145 | ★ | `achievementStatus`が毎描画で全バッジ判定（200+行）→ ログ追記時のみ差分更新キャッシュ | RG5 |
| II-146 | ★ | `mascotHome`の表情選択がネストif-else（5×3×4）→ 1Dルックアップ表に | RG5 |
| II-147 | ★ | `mascotTip`/tipIndexが毎描画で再計算（日決定論）→ メモ化 | RG5 |
| II-148 | ★★ | `streamClaude`のabort後にlive node更新が続く/cleanup不完全 → `finally`でnode削除明示 | RG5 |
| II-149 | ★ | `extractTextDelta`のJSON parse失敗が無音 → 開発時診断warn（[DONE]等の正常系と区別） | RG5 |
| II-150 | ★★ | チャット履歴トリムがsave時のみでload時に不整合（MAX変更時）→ load/append両方でトリム統一 | RG5 |
| II-151 | ★★ | localStorage quota管理がキー個別で複合圧迫の順序が曖昧 → 使用量推定＋LOG_CAP動的調整の検討（最小実装） | RG5 |
| II-152 | ★ | `importBackup`がversion>現行を一律拒否 → マイナー互換許容/メジャー拒否の段階化 | RG5 |
| II-153 | ★★ | 採点途中のpractice state（combo/hints）がタブ切替でリセット → session内保持/明示リリース | RG5 |
| II-154 | ★★ | `runFreezeBridge`が深夜の再表示で二重カウントの恐れ → 最終実行日を保存し冪等化 | RG5 |
| II-155 | ★ | `confettiBurst`のspanがanimationend後も残存しうる → animationendで削除 | RG5 |

## F. Web ビュー・アクセシビリティ・DOM安全（RR4/RR5 → RG6）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| II-156 | ★★★ | 模試タイマー`timerId`がタブ離脱の一部経路でclearInterval漏れ → setterで既存タイマー破棄＋render層で一元cleanup | RG6 |
| II-157 | ★★ | `render()`の`root.innerHTML=""`がSRの進捗/フォーカスを破壊 → `replaceChildren()`＋`aria-busy`トグル | RG6 |
| II-158 | ★★ | トースト出現はSR読上げるが消滅が告知されない → `aria-live`適正化＋消滅遷移 | RG6 |
| II-159 | ★★ | 模試タイマーの残60秒警告が視覚(color)のみでSR非通知 → `aria-label`更新＋live region | RG6 |
| II-160 | ★ | タブ切替後の自動`focus()`がprefers-reduced-motionを無視 → メディアクエリでガード | RG6 |
| II-161 | ★ | `:focus-visible`のoutlineが淡く端末により不可視 → outline+offsetを併用 | RG6 |
| II-162 | ★★ | `render()`の全体try-catchで一部タブのエラーが全タブを復旧画面化 → per-view try-catchに分離 | RG6 |
| II-163 | ★★ | `renderExamResult`がexam.setを複数回走査 → 冒頭で単一パス集計しセクションへ渡す | RG6 |
| II-164 | ★ | problems.jsonがvisibilitychange等で再パースされうる → 既読フラグで二重ロード防止 | RG6 |
| II-165 | ★★ | 読込失敗のリトライが手動のみ → onlineイベントで自動`reloadProblems()` | RG6 |
| II-166 | ★★ | `lastPersistError`が記録のみでUI通知されない（I-035の積み残し）→ render/main冒頭でトースト表示 | RG6 |
| II-167 | ★ | 模試中断確認をキャンセルしてもtimerが重複稼働しうる → confirm戻り値を明示利用 | RG6 |
| II-168 | ★ | 見直し一覧30件に一括展開/畳む操作がない → 一括制御ボタン | RG6 |
| II-169 | ★★ | `h()`の`html`属性が無条件innerHTMLで規約依存 → 安全な型（branded/専用関数）でsanitize済みのみ許可 | RG6 |
| II-170 | ★★ | views内`querySelector ... as HTMLElement`がnull黙殺（9箇所）→ ガード付き取得ヘルパー`$req()` | RG6 |
| II-171 | ★ | `exam.set[idx]`のbounds断言 → `.at()`＋空セットの別フロー | RG6 |
| II-172 | ★ | addEventListenerのcleanupがなくDOM削除時のリスナ残存懸念 → リスナ登録の集約/明示removeかdelegation | RG6 |
| II-173 | ★ | prefers-reduced-motionが全アニメ停止でfocus indicatorも消す → 操作系のみ停止、focusはinstant outline維持 | RG6 |
| II-174 | ★ | practice combo等の細粒度変更にsetterがなくrender全体呼び必須 → setter化＋必要部分のみ更新 | RG6 |

## G. テスト深度・CI・セキュリティ・データ層・配信（RR5 → RG7）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| II-175 | ★★ | プロパティ/ファズテストがない → 共有ヘルパー(pick/buildChoices/percentage/constrainRange)へランダム入力1000回 | RG7 |
| II-176 | ★★ | 統合テスト（generate→validate→保存→読込）がない → `tests/integration/`新設 | RG7 |
| II-177 | ★★ | 時刻依存テストのfake-timers適用が全数確認されていない → schedule/notify/dates系でvi.useFakeTimers徹底 | RG7 |
| II-178 | ★ | KNOWN_DIVERGENT許容リストのコメント未記入 → 各項目にTODO(audit)＋原因/PR付与 | RG7 |
| II-179 | ★ | カバレッジの分岐網羅の質が不明 → STEP_SUMMARYに要件別出力＋複雑モジュール分岐≥目標 | RG7 |
| II-180 | ★★ | テンプレ全数のgenerateFrom再現テスト（型多様性float/int）→ 全テンプレrunner（II-101移行の保証網） | RG7 |
| II-181 | ★★ | RLSポリシーのテストがない → supabase migrationのモック検証 | RG7 |
| II-182 | ★★★ | CSPがindex.htmlにない → `Content-Security-Policy` meta追加（self中心） | RG7 |
| II-183 | ★★★ | app.jsにSRI(integrity)がない → build-webでSHA-384算出しindex.htmlへ埋込 | RG7 |
| II-184 | ★★ | gitleaks誤検知対策の`.gitleaksignore`/config がない → 既知パターン許容 | RG7 |
| II-185 | ★★ | `.env.example`が公開鍵/秘密鍵を区別せず機密度が曖昧 → 注記でANON=公開/ANTHROPIC=秘密を明示 | RG7 |
| II-186 | ★★★ | supabase RLSにUPDATE/DELETEポリシー欠如・FK CASCADEなし・difficulty nullable → 新規migrationで補完（可逆コメント付） | RG7 |
| II-187 | ★★ | SWキャッシュ版数が手動(v19) → build-webがdistハッシュからCACHE値を自動更新（v20＋自動化） | RG7 |
| II-188 | ★★ | バンドルサイズがCIでバジェット化されていない → `BUNDLE_SIZE_LIMIT_KB`超過で警告→失敗＋STEP_SUMMARY | RG7 |
| II-189 | ★★ | package.json version=0.1.0固定でSemVer形骸化 → release:checkで版数自動更新＋CHANGELOG追記の土台 | RG7 |
| II-190 | ★ | CIのtest/build/validateが直列 → 独立jobの並列化でCI時間短縮 | RG7 |
| II-191 | ★ | coverageアップロードが失敗時もalways() → `if: success()`に修正 | RG7 |
| II-192 | ★ | キャッシュ破損時のclear導線がない → workflow_dispatchにclear-cacheフラグ | RG7 |
| II-193 | ★ | manifest `theme_color`がCSS `--accent`と不一致 → 同期 | RG7 |
| II-194 | ★ | index.htmlのmeta descriptionが冗長 → OGP向けに簡潔化 | RG7 |

## H. ドキュメント・DX（RG8）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| II-195 | ★★ | web/srcの実行フロー（app→router→view→state）が図解されていない → architecture.mdにmermaidフロー | RG8 |
| II-196 | ★★ | 新規テンプレ実装ガイド（正解導出・境界値・defineTemplate必須）がない → CONTRIBUTINGに実例付きガイド | RG8 |
| II-197 | ★ | スクリプト`--help`に使用例(Examples)がない → printHelpにExamples節 | RG8 |
| II-198 | ★ | 自動化パイプライン全体図がない → docs/READMEにmermaidフロー（生成→検証→配信→集計→改善） | RG8 |
| II-199 | ★ | SECURITY.mdにSVGサニタイズ規約・CSP/SRI方針・BYOK保管の記載がない → セキュリティ規約を明記 | RG8 |
| II-200 | ★ | CHANGELOGにPR参照/日付がなく履歴追跡困難＋第2ラウンドADR未作成 → CHANGELOG整備＋ADR 0002（型化/観測性の判断） | RG8 |

## 見送り（理由付き）

| ID | 内容 | 見送り理由 |
|----|------|-----------|
| X-201 | BYOK APIキーのハッシュ化/sessionStorage移行 | UX破壊（再起動毎に再入力）。BYOKは利用者の自己責任前提。設定画面で末尾4桁マスク表示(II-169近傍)のみ採用 |
| X-202 | コード分割(views動的import) | 初期化30%短縮見込みだが、オフライン第一/SWプリキャッシュと相性悪く chunk管理コスト過大。バンドルは58KB gzipで許容内 |
| X-203 | knowledge.tsの6ファイル分割 | データ凝集性を優先（第1ラウンドI-028の判断踏襲）。II-135の正確な行範囲注記＋一致検証テストで保守性を担保 |
| X-204 | 英語UI(term_en等)のi18n二重化 | フェーズ2提案。現状は国内試験専用。型に`?:`予約だけ残し本実装は見送り |
| X-205 | デプロイ失敗時の自動ロールバック | GitHub Pagesは直前アーティファクトを保持。複雑な自動化に見合う事故頻度がない |
| X-206 | cards/logsのBrotli圧縮 | quota圧迫はLOG_CAP=5000で実用上十分。圧縮はCPU/複雑性増。II-151で使用量推定の監視のみ |

## 集計

実装94項目（RG1:12 / RG2:11 / RG3:6 / RG4:13 / RG5:13 / RG6:19 / RG7:20、複数タスク跨ぎ重複含む）、
見送り6項目。全項目に対応タスクまたは理由を記載。
</content>
