# 監修フロー（合格者レビュー）

電験という**実資格の学習教材**である以上、問題・解説の正しさは最終的に
**人間（電験合格者）の専門レビュー＝監修**で担保する。本書はその運用フローと、
監修を効率化するツールをまとめる。

> 重要: 監修の判定（`validation.supervisor_checked` を true にする）は**実際に監修した人間のみ**が行う。
> 自動生成・コードでフラグを立てることはしない（虚偽の監修は学習者を誤誘導するため）。

## 検証フラグの意味

`validation` の各フラグは段階的な品質保証を表す:

| フラグ | 意味 | 立てる主体 |
|--------|------|-----------|
| `solver_checked` | 決定論ソルバで数値を再現し answer と一致 | コード（生成エンジン） |
| `clean_answer` | 答えが綺麗な値（桁・単位が整っている） | コード |
| `physically_valid` | 力率≦1・効率≦1・ゼロ割なし等、物理的に成立 | コード |
| `human_checked` | 人が手で解き直して一致を確認 | 人間（作問者/レビュア） |
| `supervisor_checked` | **電験合格者が監修し妥当と判断** | **人間（合格者）** |
| `confidence` | 出題可否の自信度（閾値未満は出題しない） | 作問時 |

`status=validated/published` には検証4項目（solver/human/clean/physical）が全 true 必要。
**監修（supervisor_checked）はその上位**の保証で、公開ベータ前の必須ゲート。

## 段階（パイプライン）

```
draft ──(検証4項目)──▶ validated ──(合格者監修)──▶ supervised
needs_validation       needs_supervision            supervised(完了)
```

`lib/audit/supervision.ts` の `supervisionStage()` が各問題を上記3段階に分類する。

## 運用フロー

1. **進捗の把握**
   ```bash
   npm run supervision:status            # 科目・論点別の監修カバレッジと待ち行列
   npm run supervision:status -- --json  # CI/ダッシュボード連携用
   ```
2. **レビューパケットの生成**（監修待ち問題を合格者へ渡す形に）
   ```bash
   npm run supervision:packet -- --out out/supervision-packet.md
   ```
   各問題に本文（Obsidian Markdown）＋監修チェックリスト＋記入欄が付く。
3. **合格者による監修** — パケットのチェックリストに沿って手で検算・出典確認・物理妥当性・
   誤答選択肢の妥当性・法改正整合・著作権を確認する。
4. **フラグ更新** — 合格と判断した問題のみ、`supervisor_checked` を `true` に更新する。
   手編集ミスを避けるため専用コマンドを使う（整形を壊さず対象キーのみ書換・冪等）:
   ```bash
   npm run supervision:mark -- T-0001 T-0002   # 監修合格した id を列挙
   ```
   このフラグは「合格者が監修した」という主張であり、**実行者が責任を負う**。要修正は作問へ差し戻す。
5. **再集計** — `npm run supervision:status` でカバレッジの前進を確認。
   `npm run audit:status` の「監修済み問題がまだありません」は監修が進むと解消する。

## 監修チェックリスト（パケットに自動付与）

- 数値を独立に再計算し、answer と solution の各ステップが一致するか
- 出典(source/citation)が妥当で、改題なら原典との差分が許容範囲か
- 物理的に成立するか（力率≦1・効率≦1・ゼロ割なし・負値なし）
- 誤答選択肢が『成立する引っ掛け』か（明らかに不成立な選択肢がないか）
- 法規・制度は最新の改正に整合するか（古い基準を引いていないか）
- 問題文・解説に著作権上の引き写しがないか

## 誰が監修できるか

電験（対象級）合格者、または同等の専門知識を持つ実務者。氏名・資格は監修記録として残す
（記入欄）。重要論点（法規・保安・計算の核）は必ず監修を通す。

## 関連

- ロードマップ M2「実Supabase/Auth接続 + 監修フロー」、人間タスクは [`human-tasks.md`](./human-tasks.md)。
- 品質パイプライン全体: [`03-quality-hardening-plan.md`](./03-quality-hardening-plan.md)。
- ツール実装: `lib/audit/supervision.ts`・`scripts/supervision-status.ts`・`scripts/supervision-packet.ts`。
