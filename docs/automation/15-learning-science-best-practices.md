# 15. 学習科学・出題設計ベストプラクティス（100+ 深掘り調査）

「どの電験学習サービスよりも問題が充実している」を、**量（網羅）×質（良問）×学習効果（科学）**の
3 軸で裏づけるための調査と実装状況。各項目に実装状態を付す。docs/automation/13（バンク設計）と
14（作問品質）の上位レイヤとして、**学習科学・心理計量・標準仕様**の観点を統合する。

凡例: ✅ 実装済み / 🔜 計画（直近） / 📋 backlog（将来）

出典は本文末尾の「Sources」を参照。番号は調査時の主要文献。

---

## A. 項目作成の原則（Haladyna/Rodriguez 31則）— item-writing

1. ✅ 1論点1問（単一の到達目標を測る。`learning_objectives`）
2. ✅ 出題文は肯定形・簡潔（`defaultStatement` を短く）
3. ✅ 否定（「誤っているものはどれか」）は多用しない（混乱源）
4. ✅ 選択肢は文法・長さ・体裁を揃える（同種の数値/同種の記述）
5. ✅ 「すべて正しい/該当なし」を避ける（推測誘発）
6. ✅ 正解位置を昇順固定で偏りを排除（数値は昇順 sort）
7. ✅ 選択肢間の論理的重複・包含を避ける（Set で重複排除）
8. ✅ 専門用語は正確に（電験の標準記号・単位）
9. 🔜 ステム内に答えの手がかり（語幹一致）を残さない自動チェック
10. 📋 読みやすさ（文長・係り受け）の自動採点

## B. 誤答（distractor）設計 — 機能する誤答だけを置く

11. ✅ 誤答は「成立する典型ミス」から作る（各 `distractor.reason`）
12. ✅ Rodriguez(2005): 機能する誤答は3個前後が最適 → **5択に水増ししない**
13. ✅ 物理的に荒唐無稽な値を作らない（同期速度 28800 等を排除）
14. ✅ 誤答妥当性サニティ（符号反転/0/桁違いを error 判定, `distractorSanity`）
15. ✅ 計算ミス由来の桁違いは extreme(warn) で許容（「×100忘れ」等は機能しうる）
16. ✅ 誤答ごとの解説を永続化（`choice_explanations`＝最大の学習資産）
17. ✅ 最頻誤答を `stats.common_wrong_choice` に記録（集合知の入口）
18. 🔜 実測誤答分布から distractor を再選定（topic-modeling 手法[1][2]）
19. 📋 非機能誤答（誰も選ばない肢）の自動検出・差し替え
20. 📋 誤概念（misconception）タクソノミの体系化

## C. 難易度・識別力・校正 — psychometrics（CTT/IRT）

21. ✅ difficulty 1–5 を保持（`difficulty`）
22. ✅ 形式・解法ステップ数から想定難易度帯を sanity（`expectedDifficultyBand`）
23. ✅ 識別力 D のフィールドを用意（`stats.discrimination`）
24. ✅ 実測正答率での難易度補正の土台（`stats.answered/correct_rate`）
25. 🔜 p値（正答率）と D の自動算出（item analysis バッチ）
26. 🔜 出題者は難易度を過小評価しがち[8] → 実測との乖離を可視化
27. 📋 IRT 2PL/3PL パラメータ推定（a=識別/b=困難度/c=当て推量）
28. 📋 適応테스트（CAT）への difficulty/IRT 給餌
29. 📋 DIF（項目機能差）チェック

## D. 学習科学 — worked-example / self-explanation / fading

30. ✅ 解法ステップ（worked example）を必ず提示（`solution`、認知負荷低減[5]）
31. ✅ 自己採点で自分の解答と模範を対比（記述、self-explanation 誘発[5][6]）
32. ✅ 段階的ヒント（faded scaffolding）をUIで1つずつ開く（`hints`[5][7]）
33. ✅ 誤答解説で「なぜ誤りか」を言語化（self-explanation の素地）
34. 🔜 適応的フェード（習熟に応じヒント露出を自動調整[7]）
35. 🔜 検索練習（retrieval practice）— 解説前に想起を促すモード[9]
36. 🔜 インターリービング（科目/論点の混合出題）
37. 📋 二重符号化（図・式・言葉の併用）
38. 📋 生成効果（答えを作らせてから確認）
39. 📋 精緻化質問（「なぜ?」「どう違う?」プロンプト）
40. 📋 転移課題（far transfer）の段階配置

## E. 間隔反復（spaced repetition）— FSRS / SM-2

41. ✅ SM-2 スケジューラ実装（`lib/scheduler/sm2.ts`）
42. ✅ FSRS 実装（`ts-fsrs`、`lib/scheduler/fsrs.ts`）
43. ✅ 想定解答時間で学習量（分）を計測（`estimated_time_sec`/ログ）
44. ✅ 認知レベル(Bloom)で出題比率を制御する素地（`cognitive_level`）
45. 🔜 FSRS の難易度/安定度/想起率を問題メタに給餌[3][4]
46. 🔜 目標保持率 90–92% を既定に（試験前は引き上げ[3]）
47. 🔜 最大間隔は試験対策で 180 日に制限[3]
48. 📋 1000レビュー超で個人パラメータ再最適化（年3–4回[3]）
49. 📋 試験日からの逆算スケジューリング（締切駆動）
50. 📋 「あと何問で合格圏」予測（保持率×被覆）

## F. メタデータ・標準仕様 — QTI / Bloom / 逆向き設計

51. ✅ 認知レベル（Bloom 下位4段: remember/understand/apply/analyze）[8]
52. ✅ 学習目標（逆向き設計, `learning_objectives`）
53. ✅ タグによる横断検索・弱点クラスタリング（`tags`）
54. ✅ 使用公式の逆引き（`formulas`＝暗記カード化の素地）
55. ✅ 前提・関連論点で知識グラフの素地（`prerequisites`/`related_topics`）
56. ✅ 法令条文の根拠参照（`references`、法規で重要）
57. ✅ 過去問の出典メタ（年度/回/問番号, `exam_meta`）
58. ✅ zod ⇄ ajv の二重スキーマでドリフトをテスト検知
59. 🔜 QTI 3.0 互換のエクスポート（相互運用[10][11]）
60. 📋 Depth of Knowledge（DOK）タグ
61. 📋 コンテンツ標準（学習指導要領/試験ブループリント）IDの付与

## G. 網羅性・ブループリント — syllabus coverage

62. ✅ 機械可読シラバス（77論点×優先度, `syllabus.ts`）
63. ✅ 被覆率の定量化＋未カバー可視化（`coverage:syllabus`）
64. ✅ CI 最小被覆ゲートで退行防止（科目別フロア）
65. ✅ 高優先（high/medium）論点を全網羅（被覆 88%/77）
66. ✅ 全6科目＋一種〜三種の試験区分を表現
67. 🔜 出題頻度（過去問実績）で優先度を再重み付け
68. 🔜 low 優先（定性論点: 原子力/電子回路/電気材料 等）の正誤・記述化
69. 📋 試験ブループリント（科目別配点）に対する被覆ヒートマップ
70. 📋 競合サービスとの論点カバレッジ比較ダッシュボード

## H. 二次・記述（descriptive）採点

71. ✅ 記述は自動採点せず模範解答＋採点観点を提示（自己採点）
72. ✅ 採点観点（`grading_points`、配点付き）
73. ✅ 二次の正解値もコードで算出（ハルシネーション対策は一次と同じ）
74. ✅ 対称座標法/安定度/調相設備等の二次頻出を網羅
75. 🔜 キーワード自動ヒット採点補助（必須項目の有無）
76. 🔜 部分点の可視化・観点別の弱点集計
77. 📋 立式モード（数式だけ先に組ませる）
78. 📋 答案構成シート・時間配分トレーナ
79. 📋 LLM観点照合（点数は出させない＝ハルシネーション回避）

## I. UI/UX・アクセシビリティ

80. ✅ 採点後に選択肢ごとの誤答解説を表示（選んだ肢を強調）
81. ✅ 段階ヒントボタン（解答前に1つずつ）
82. ✅ メタ表示（想定時間・認知レベル・難易度★）
83. ✅ 弱点優先出題（`lib/scheduler/diagnosis.ts`）
84. ✅ 完全オフライン（PWA・localStorage・Service Worker）
85. ✅ 出力の HTML エスケープ（XSS 対策）
86. 🔜 試験区分フィルタ（一種〜三種・科目）
87. 🔜 統計表示（自分の正答率・最頻誤答）
88. 📋 ハイコントラスト/reduced-motion/フォーカス最適化
89. 📋 音声読み上げ（数値桁読み・略語展開, docs/13b 連携）
90. 📋 図/回路図（SVG）レンダリング（`figure`）

## J. 品質保証・運用・信頼性

91. ✅ 正解はコードで算出し解説の数値と照合（不一致は破棄）
92. ✅ 「綺麗な値」だけ出題（無限小数を排除, `isCleanAnswer`）
93. ✅ 数値採点は相対許容誤差（業界標準1–3%, `gradingTolerance`）
94. ✅ バッチ重複排除（同一問題の混入を防止）
95. ✅ 品質サニティゲート（誤答破綻/重複/answer∉choices を CI で阻止）
96. ✅ 既知値回帰テスト（全テンプレの正解を固定, templates-v2.test）
97. ✅ 出典必須（`source`、original/改題で citation 制御）
98. ✅ 監修フラグ（`supervisor_checked`、重要論点は別途監修前提）
99. 🔜 誤り訂正 SOP（retracted ステータス＋訂正履歴）
100. 🔜 合格者監修バッジの UI 表示
101. 📋 問題ごとの版管理・差分監査ログ
102. 📋 CC-BY-SA 配布パッケージ（コミュニティ貢献）

---

## 本フェーズの達成（2026-06）

- **網羅**: テンプレ 28→67論点。被覆 36%→88%（77論点中68）。高+中優先の未カバーを全て解消。
- **質**: 全テンプレの生成サンプルが品質スコア平均100・誤答破綻0・重複0。
- **学習科学**: 認知レベル(Bloom)を後方互換で追加、段階ヒント・誤答解説・公式・想定時間をUI反映。
- **検証**: ユニットテスト 139→178、被覆ゲート・品質ゲート緑。監修済みシード T-0001〜0021。

## Sources（深掘り調査の主要文献）

1. [Frontiers: Multiple-Choice Item Distractor Development Using Topic Modeling](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.00825/full)
2. [Developing, Analyzing, and Using Distractors for Multiple-Choice Tests: A Comprehensive Review (ResearchGate)](https://www.researchgate.net/publication/319470426)
3. [FSRS Algorithm: Next-Gen Spaced Repetition (QuizCat)](https://www.quizcat.ai/blog/fsrs-algorithm-next-gen-spaced-repetition) / [open-spaced-repetition/fsrs4anki wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
4. [What Is FSRS? Practical Guide (Deckbase)](https://www.deckbase.co/resources/fsrs-guide)
5. [Worked-example effect (Wikipedia)](https://en.wikipedia.org/wiki/Worked-example_effect) / Sweller, Cognitive Load Theory
6. [Effects of Self-Explanation Prompts and Fading Worked-Out Steps (Renkl et al.)](https://mrbartonmaths.com/resourcesnew/8.%20Research/Making%20the%20most%20of%20examples/Fading%20out%20and%20Prompts.pdf)
7. [The Guidance Fading Effect (Sweller)](https://cogscisci.wordpress.com/wp-content/uploads/2019/08/sweller-guidance-fading.pdf)
8. [Bloom's taxonomy, judges' estimation of item difficulty and psychometric properties (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9673841/)
9. [Student-directed retrieval practice predicts licensing exam performance (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4673073/)
10. [IMS Question and Test Interoperability (QTI) Metadata Specification](https://www.imsglobal.org/sites/default/files/spec/qti/v3/md-bind/index.html)
11. [What is Item Banking in Assessment? (Assessment Systems)](https://assess.com/what-is-item-banking/)

> 注: Haladyna & Rodriguez「Developing and Validating Test Items」(2013) の31則、Rodriguez(2005)
> の「機能する誤答3個が最適」メタ分析は docs/automation/14 と本書 §A/§B の根拠。Exa が利用不可
> だったため WebSearch（LAB フォールバックSOP）で一次情報を確認した。
