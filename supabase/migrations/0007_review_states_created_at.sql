-- 0007: review_states に created_at を追加（II-141 createdAtMs の永続化）
-- 背景: ReviewState.createdAtMs は状態の生成時刻で、長期未レビュー状態（古い参照）の検出に使う。
--   InMemory/File ストアはオブジェクト全体を保存するため保持されるが、Supabase 経路は
--   対応列が無くマッパーで暗黙に欠落していた（往復すると undefined に退化し、本番のみ
--   II-141 の鮮度検知が機能しない）。列を追加しマッパーで往復させる。
-- 方針: nullable・default なし。既存行を now() で埋めると「古い状態」が新品に見えてしまい
--   II-141 の目的を壊すため、既存行は NULL のままにする（= createdAtMs undefined。
--   ドメイン型の optional セマンティクスと一致）。
alter table public.review_states
  add column if not exists created_at timestamptz;
