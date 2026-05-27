# 設計判断とアイデア集（リサーチ記録）

> 本リポジトリの方針: **リサーチした内容はそのまま `docs/` にコミットする**（議論を後から辿れるように）。

## 1. 画像生成の境界に関する設計判断（2026-05）

### 結論
「ChatGPT-Image（gpt-image 系）で図を作って問題品質を上げる」は、**コア技術図には逆効果**。
電験の図は回路トポロジー・数値・軸・極性が1つでも狂うと不正解の図になるため、
**数値由来の決定論的コード生成（schemdraw / matplotlib ← solver 値）が最適**。

### 根拠
- OpenAI 自身が gpt-image 系を「科学的・技術的な精密さが必要な図には非推奨。誤りを含む」と明記。
  得意領域はマーケ素材・インフォグラフィック・（ラテン文字の）テキスト描画。
- 研究でもコード生成型（TikZ/matplotlib）が画像-テキスト整合・関係正確性で優位。
  ラスタ生成は構造が壊れ編集も不可。複雑図は agent ベースの反復改良が推奨。
- MLLM-as-judge は補助的には有効だが幻覚・判定揺れがあるため、最終合否は決定論検算に置く。
- Codex（GPT-5.5）は数時間の自走・並列サンドボックスが可能。役割は「開発自動化」に限定し、
  問題生成のランタイムにコーディングエージェントを常駐させない（コスト・非決定性回避）。

### 用途別の手段
| 用途 | 手段 | 理由 |
|---|---|---|
| 回路図・単線図・フェーザ・波形・ベクトル・ボード線図 | コード生成（本命・拡張中） | 数値・トポロジー保証 |
| LLM が新規トポロジーを作る複雑図 | LLM→コード（schemdraw/TikZ）+ 再実行検証 | コードは検証・編集可 |
| 挿絵・実機写真・章扉・サムネ | gpt-image 系を **decorative 限定** | 精密さ不要な装飾のみ |
| 生成図の正しさチェック | VLM-as-judge（補助・警告のみ） | 幻覚があるため最終判定にしない |

### 実装済みのガバナンス土台
- `FigureSpec.role` = `technical` / `decorative`、`FigureRef.provenance`（solver/llm_code/raster）。
- catalog ロード時に未登録 figure kind を fail-fast 検出。
- raster 生成（gpt-image）実呼び出しは保留（API キー/ネットワーク要・オフライン検証不可のため優先度低）。

## 2. アイデア 100（テーマ別）

### A. 画像/図のガバナンス
1. 図種別を technical/decorative にタグ付けし技術図での画像生成を物理的に禁止。
2. FigureRef に provenance を記録しフロントマターへ出力（監査可能化）。
3. 装飾画像は採点・解法に依存させない契約をテストで強制。
4. gpt-image には数値・式・単位を描かせないプロンプト規約（捏造の余地を消す）。
5. raster 画像に AI 生成メタデータを付与。
6. 技術図=SVG、装飾=PNG/WebP で形式分離。
7. `--images decorative|none`（既定 none、再現性優先）。
8. 著作権ガード継続（参考書スキャン不可を lint で担保）。
9. 図が無くても問題が成立する不変条件（生成失敗で品質劣化しない）。
10. 装飾画像は別ディレクトリへ隔離し再現性ハッシュ対象外。

### B. コード生成型ダイアグラム拡張
11. 波形図（正弦/三相/整流/PWM）— 実装済。
12. ベクトル軌跡・円線図（同期機/誘導機）。
13. ボード線図・根軌跡（自動制御）— ボード実装済。
14. 等価回路ライブラリ（変圧器/誘導機 T 形）。
15. 単線図の実数値ラベル化（本文と二重化で整合チェック）。
16. フェーザ図の電圧系/電流系の縮尺分離。
17. 図のゴールデン回帰テスト（SVG 構造比較）。
18. LLM→schemdraw コード生成（実行成功したコードのみ採用、反復改良）。
19. 生成コードのサンドボックス実行（import 許可リスト）。
20. TikZ 出力（LaTeX 教材用、同一 spec から SVG/TikZ）。

### C. gpt-image の正しい活用（非技術）
21. 章扉・分野アイコン。22. 動機付け挿絵。23. サムネ/OGP。
24. テキスト描画の強みは表紙バナーに限定。25. 画像キャッシュ&再利用。
26. 分野別プロンプトでトーン統一。27. 事前バッチ生成（ランタイム生成しない）。
28. 権利侵害/不適切混入を VLM で検出。29. quality=low 既定でコスト管理。30. 画像なし版を常に同梱。

### D. VLM-as-judge 視覚検証ゲート
31. 図と本文数値の一致を Yes/No+根拠で判定。32. 最終合否は決定論検算、VLM は警告のみ。
33. 複数サンプル多数決で安定化。34. 図→JSON 化して spec と diff。35. ラベル可読性チェック。
36. 軸・凡例・単位欠落の二段チェック。37. 判定ログ保存で監査サンプリング。
38. `--verify-figures` opt-in、CI はサンプル抽出。39. 評価プロンプト最適化（coarse→fine）。40. 失敗図は再生成 or コード差し戻し。

### E. Codex 自走 / マルチエージェント開発
41. Codex は開発タスク、Claude はレビュー&マージで相互チェック。42. テンプレ1本=1サンドボックス並列。
43. auto-edit 許可・shell は承認、`denken check` をゲート。44. エージェント間契約をテストで固定。
45. モデル多様性でバグ検出率向上。46. 夜間バッチ量産→朝キュレーション。47. 作業ログの来歴保存。
48. プロンプト/設定をリポジトリ管理。49. コスト上限・タイムボックス。50. 生成ランタイムにエージェントを置かない原則。

### F. 生成品質: self-refine / critique / consistency
51. 自己批判→修正→比較ループ（SRefine）。52. 解法ステップの自己整合チェック。
53. 論説 N 案生成→rubric 最高案。54. 難易度キャリブレーション。55. ひっかけ要素の制御。
56. 重複類似度チェック。57. 別解生成。58. 典型誤答辞書を解説に付与。59. 検算の自動付与。60. 物理妥当性チェック拡充。

### G. 図・テキスト・数値のグラウンディング
61. 全要素を単一ソース（solver 値）から生成。62. 単位ライブラリ(pint)で次元検証。
63. 図ラベルと本文記号の対応表自動生成。64. LLM 文中数値を solver 値と完全一致検証。
65. 有効数字ポリシー一元化。66. SI 接頭辞自動整形（表示のみ、内部値不変）。
67. 図座標も値由来（φ 角一致）。68. 記号用語集の科目内共有。69. i18n 分離。70. 決定論ハッシュをテスト固定。

### H. データ/テンプレ/カバレッジ
71. 過去問頻度で出題重み付け。72. テンプレ 100 本（分野均等）。73. テンプレ静的 lint。
74. `new-template` スカフォールド。75. 未カバー分野の可視化。76. 電圧階級など現実レンジ標準化。
77. テンプレに references（公式・法則名）。78. 模試セット自動組立。79. テンプレ versioning。80. 寄稿仕様ドキュメント。

### I. 評価・回帰・CI・観測性
81. ゴールデンセット回帰。82. 図構造+本文スナップショット。83. CI に図スモーク追加。
84. 品質メトリクスのダッシュボード。85. LLM/VLM コスト・レイテンシ計測。86. 非決定要素を再現テストから除外。
87. プロパティベーステスト。88. 失敗サンプル自動収集。89. モデル更新時 A/B 回帰。90. セキュリティスキャン。

### J. UX / 学習効果 / 配信 / 運用
91. FSRS 復習と弱点分野推定の連動。92. Anki/PDF/HTML エクスポート。93. ダーク/ライト SVG。
94. 構造化 alt（数値含む）でアクセシビリティ。95. 段階開示（ヒント→部分解→完全解）。96. 記述採点（rubric 流用）。
97. オフライン完結を既定。98. コスト試算ダッシュボード。99. 配信ライセンス整理。100. ロードマップ反映。

## 2.5 単位・次元検証の実装記録（2026-05-27）

### 背景・根本原因
テンプレートの式（SymPy）と宣言単位の **次元整合は何も検証されていなかった**。
`Vd = I + R`(A+Ω) や、式は正しいが宣言単位だけ誤り、といったオーサリングバグを
生成・検証パイプラインがすり抜けていた。

### 実装
- `denken/units.py`: pint で解答式を物理量評価し、解答の次元 = 宣言単位の次元 を検証。
  - **解答式の依存閉包のみ**評価（三角関数など評価困難な補助式を回避）。
  - `pint.DimensionalityError` は明確なバグ → `ok=False`。
  - 未対応関数などその他例外は「検証不能(`checked=False`)」としビルドは止めない。
- `denken check` に統合し、次元不一致があれば終了コード 1。
- pint は `microfarad` 等にも対応するため µF 値も次元的に検証可（1e-6 はスケール=無次元）。

### 根拠（ベストプラクティス）
- pint は UnitRegistry で次元解析・`DimensionalityError`・numpy ufunc 対応を提供する標準ライブラリ。
- 次元整合チェックは「方程式の物理的正しさを確認する」確立された手法で、
  式の誤りを早期に検出できる（両辺・各項の次元一致）。

### 参考
- pint Tutorial — https://pint.readthedocs.io/en/stable/getting/tutorial.html
- Units and Dimensional Analysis (Engineering LibreTexts) — https://eng.libretexts.org/Bookshelves/Introductory_Engineering/Introduction_to_Engineering_-_Thinking_Like_an_Engineer/05:_Units_and_Dimensional_Analysis

## 2.6 数値グラウンディング検証 + ゴールデン回帰（2026-05-27）

### 背景・根本原因
本エンジンの核心テーゼは「LLM に計算させない」。しかし LLM(Ollama)バックエンドが
問題文・解説を整形する際に **数値を捏造・改変するリスク** に対するガードが弱かった
（最終解答の出現確認のみ）。また、リファクタや generator 変更で出力が意図せず変わる
**回帰を検出する仕組みが無かった**。

### 実装
- **数値グラウンディング**（`validate.check_numeric_grounding`）:
  問題文・解説中の全数値トークンを抽出し、許容集合
  「solver の全中間値 ∪ 解答 ∪ テンプレ文字列中のリテラル定数 ∪ 構造定数{0,1,2,3,100}」
  で説明できるか照合。±2% は表示丸めとして許容。説明できない数値があれば不合格。
  - `validate()` の calc 合否に統合 → `generate_validated` が捏造を検知して再生成。
  - stub は出力=テンプレ整形のため構造的に必ず合格（決定論を維持）。
- **ゴールデン回帰**（`tests/test_golden.py` + `tests/golden/*.json`）:
  決定論フィールド（statement/answer/steps/explanation 等）のみ保存・比較。
  timestamp 等の揮発要素は除外。更新は `DENKEN_UPDATE_GOLDEN=1 pytest`。

### 根拠（ベストプラクティス）
- faithfulness/groundedness 検証は「主張を抽出 → 出典と照合 → 充足率」が定石。
  数値は **決定論的な白box照合**が可能で、LLM-as-judge より確実・安価。
- ゴールデンテストは timestamp/ID を正規化して比較するのが定石。スクラバの乱用は避ける。

### 参考
- How to Detect Hallucinations in LLM Apps — https://www.getmaxim.ai/articles/how-to-detect-hallucinations-in-your-llm-applications/
- Consistency Is the Key (arxiv 2511.12236) — https://arxiv.org/html/2511.12236v1
- Pytest Regressions / Golden File Updates 2025 — https://johal.in/pytest-regressions-data-golden-file-updates-2025/
- Golden Tests in AI | Shaped — https://www.shaped.ai/blog/golden-tests-in-ai

## 3. 参考文献
- OpenAI: GPT Image 1 Model — https://developers.openai.com/api/docs/models/gpt-image-1
- GPT Image 2 Guide (2026) — https://mindwiredai.com/2026/04/22/what-is-gpt-image-2-the-complete-breakdown-features-pricing-and-who-gets-access/
- DiagrammerGPT (arxiv 2310.12128) — https://arxiv.org/pdf/2310.12128
- LLM Code Customization on TikZ (arxiv 2505.04670) — https://arxiv.org/abs/2505.04670
- DiagramIR (arxiv 2511.08283) — https://arxiv.org/pdf/2511.08283
- MLLM-as-a-Judge — https://www.emergentmind.com/topics/mllm-as-a-judge-mechanism
- MCQG-SRefine (arxiv 2410.13191) — https://arxiv.org/pdf/2410.13191
- RubricHub (arxiv 2601.08430) — https://arxiv.org/pdf/2601.08430
- OpenAI Codex 2026 Guide — https://tosea.ai/blog/openai-codex-complete-guide-2026
