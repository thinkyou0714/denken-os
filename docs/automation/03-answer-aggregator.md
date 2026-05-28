# 実装指示 03: 解答集計（正答率→夜解答＋データ還元）

> ステータス: 指示のみ（未実装）。

## 0. ゴール
朝の出題への回答を集計して正答率を算出し、夜解答テキストに差し込む。
さらに `problem.stats`（answered / correct_rate / common_wrong_choice）へ書き戻し、
**誤答データ＝堀**（`06-moat-community.md`）と難易度補正（`02-content-engine.md`）に使う。

## 1. 核心の設計判断 ★（ベストプラクティス）
- **集計は X アンケート(poll)の結果を一次ソースにする**。
  リプの番号解析は表記ゆれ（「3」「③」「3番」）でノイズが大きい→**補助**に留める。
- 正答率は「投票×」なので、出題時に**必ず poll も併設**する前提（02と連携）。

## 2. 参照
- `docs/x-strategy/templates/problem-schema.json`（stats フィールド）
- `docs/x-strategy/02-content-engine.md`（難易度を実測正答率で補正）

## 3. スタック
- TypeScript + Node。X API v2（poll 結果取得 / 投稿メトリクス）。

## 4. 機能要件
- 締切（夜の解答時刻）に朝出題の poll 結果を取得
- correct_rate = 正解票 / 総票、common_wrong_choice = 最多誤答
- 夜解答テキストへ「リプの○%が②でした」を差し込む（02 へ渡す）
- `problem.stats` を更新（answered≥0, rate∈[0,1] の範囲を保証）
- 難易度★を実測 rate で補正する提案値を出力（自動上書きはしない＝人間確認）

## 5. 受け入れ条件
- [ ] poll 結果から correct_rate / common_wrong_choice を正しく算出
- [ ] stats 更新が schema の範囲制約を満たす
- [ ] poll が無い投稿は「集計不可」と明示してスキップ
- [ ] 難易度補正は「提案」に留まり、自動上書きしない

## 6. やらないこと
- リプ本文の自然言語解析を主集計にする（ノイズ大。補助のみ）
- 難易度の自動上書き（人間が承認）
