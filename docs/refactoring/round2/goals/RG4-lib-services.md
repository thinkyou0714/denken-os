# RG4: スケジューラ・診断・知識・ストアの健全性と観測性

対応: II-130〜II-142（[ideas-round2.md](../ideas-round2.md)） / Wave 1

## 目的（根本原因RR3/RR4）

スケジューラの設計根拠が未記載、診断スコアが恣意的、retrieve品質が未検証、ストアにrecovery戦略がない。

## 所有ファイル（これ以外は編集禁止）

- `lib/scheduler/**`, `lib/store/**`, `lib/chat/**`, `lib/aggregate/**`, `lib/ingest/**`,
  `lib/correction/**`, `lib/notify/**`, `lib/analytics/**`, `lib/community/**`, `lib/crosspost/**`,
  `lib/share-card/**`, `lib/clients/**`, `lib/audit/**`
- 新規テスト追加のみ: `tests/scheduler/getScheduler.test.ts`, `tests/chat/knowledge-sections.test.ts`（既存テスト変更禁止）

## 他タスクとの契約

- `lib/engine/**`（RG1〜RG3）は編集禁止・importのみ。`lib/shared/**` はimportのみ。
- 既存exportシグネチャは不変（追加のみ）。既存テスト無変更でグリーン。
- supabase-storeのlenientモードは**既定で従来挙動（strict）**とし、オプトインに限る（既存テスト不変）。

## 実装項目

1. **SM-2 ease根拠＋暴走監視**（II-130）: コメントにWozniak 1990の参照を追加。ease異常値（例>100）で
   warningログを出せるように（既定はno-opでも可、デバッグ容易性）。
2. **weaknessScore根拠＋テスト**（II-131）: 係数(10,1,0.1)の根拠/設計意図をJSDocに明記。
   境界値テストはRG7に委ねるが、関数を純粋・テスト可能に保つ。
3. **getScheduler選択機構**（II-132）: FSRS/SM-2をtype-safeに選ぶ`getScheduler(kind)`を提供し、
   既定はFSRS（現行）。選択根拠をJSDoc/ドキュメントに。
4. **weakestTopics limit明示**（II-133）＋公開関数JSDoc（II-142）。
5. **aggregate失損の具体化**（II-134）: 長さ不一致warningに失われたindex範囲を付与。
6. **knowledge.ts セクション精緻化**（II-135）: 科目セクションの正確な行範囲注記。
   一致検証テストはRG7。分割はしない（X-203）。
7. **retrieve品質**（II-136）: `minScore=0.18`・重み0.7:0.3の根拠JSDoc。テスト拡充はRG7。
8. **knowledge メタ**（II-137）: 各エントリ（or KNOWLEDGE全体）に`lastReviewedAt`等のレビュー基準メタ。
9. **supabase lenientモード**（II-138）: zod検証失敗時にスキップ＋記録するオプトインモード。既定strict。
10. **ingest citation検証**（II-139）: `parseCitation()`で出典フォーマット（年度＋区分＋科目）を検証。
11. **store並行性の契約明記**（II-140）: file-store/supabase-storeのJSDocに並行性/トランザクション制限。
12. **Card/ReviewState createdAtMs**（II-141）: 生成時刻メタを追加（軽量・後方互換）。

## 受け入れ基準

- `npx vitest run tests/scheduler tests/store tests/chat tests/aggregate tests/ingest tests/notify tests/analytics tests/community tests/audit` 全グリーン（既存無変更）。
- `npx biome check lib/scheduler lib/store lib/chat lib/aggregate lib/ingest lib/correction lib/notify lib/analytics lib/community lib/crosspost lib/share-card lib/clients lib/audit` エラーなし。
- `npx tsc --noEmit` がRG4所有起因のエラーなし。
- supabaseの既存テスト（tests/store/supabase-*）が無変更でグリーン（lenient導入が正常系を変えない証明）。
</content>
