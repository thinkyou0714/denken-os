# RG8: ドキュメント整合・テンプレ実装ガイド・ADR

対応: II-195〜II-200（[ideas-round2.md](../ideas-round2.md)） / Wave 3（コード確定後）

## 目的

第2ラウンドの実装（物理制約ヘルパー・型強化・観測性・性能キャッシュ・a11y・CSP/SRI・SW自動版数）に
ドキュメントを一致させ、新規テンプレ実装ガイドとADRを整備する。

## 所有ファイル（これ以外は編集禁止）

- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`
- `docs/**`（新規`docs/adr/0002-types-and-observability.md`含む。`docs/refactoring/round2/`のステータス追記）
- コード（lib/web/scripts/tests/設定）は一切編集禁止。**必ず現物コードを読んで**現状を記述すること。

## 実装項目

1. **architecture.md**（II-195）: web/srcの実行フロー（app.ts初期化→router→view dispatch→state mutation）の
   mermaidフロー図を追加。RG1〜RG7の構造変化（lib/shared/constants、getScheduler、キャッシュ層）を反映。
2. **CONTRIBUTING.md**（II-196）: 「新規テンプレ実装ガイド」を新設。defineTemplate必須・constrainRange利用・
   正解導出/境界値テストのチェックリスト・既存テンプレ（electric-heating等）の解剖例。
3. **スクリプトExamples**（II-197）: scripts/shared.tsのprintHelpにExamples節（実装はRG7だがREADME/CONTRIBUTINGに使用例記載）。
4. **docs/README 全体図**（II-198）: 自動化パイプライン（生成→検証→配信→集計→改善）のmermaidフロー。
5. **SECURITY.md**（II-199）: SVGサニタイズ規約・CSP/SRI方針・BYOK APIキー保管（localStorage・自己責任）の明記。
6. **CHANGELOG＋ADR**（II-200）: CHANGELOGにPR参照/日付＋第2ラウンドエントリ（挙動不変を明記）。
   `docs/adr/0002-types-and-observability.md`（discriminated union採用・観測フック・キャッシュ戦略の判断）。
7. **round2/plan.md**: 各タスクの完了状態を追記。ideas-round2.mdに実装からこぼれた項目があれば見送りへ移し理由記載。

## 受け入れ基準

- README/CONTRIBUTINGのscript名・パス・フラグが実ファイルと一致（grep/lsで突合）。
- architecture.md/docs READMEのmermaidが正しい構文・記載パスが実在。
- ADRがContext/Decision/Consequences構成。リンク切れなし。
</content>
