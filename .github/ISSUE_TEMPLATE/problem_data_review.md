---
name: 問題データレビュー
about: validated/published に進める問題データの検算・出典・監修確認
title: "[problem-review] "
labels: problem-data, review
---

## 対象

- problem id:
- file path:
- topic:
- format: <!-- multiple_choice / numeric / descriptive -->

## 検算チェック

- [ ] 正解はコードまたは独立した手計算で再計算した
- [ ] 解説の最終数値・単位が `answer` と一致している
- [ ] numeric の丸め規則が明記されている
- [ ] multiple_choice の `answer` が `choices` に含まれている
- [ ] 典型誤答 `common_wrong_choice` が妥当である

## 出典・権利チェック

- [ ] `source.type` が正しい
- [ ] `original` 以外は `citation` を明記している
- [ ] 過去問由来の場合、原典そのままではなく改題/引用範囲を確認した

## 公開ゲート

- [ ] `human_checked=true` にできる
- [ ] 監修者確認済みなら `supervisor_checked=true` にできる
- [ ] `npm run validate:data` が通る
- [ ] `npm run audit:status` の件数変化を確認した

## メモ

<!-- 気になった式変形、単位、難易度、受験者が詰まりそうな点 -->
