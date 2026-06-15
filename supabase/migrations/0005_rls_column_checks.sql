-- 0005: RLS INSERT/UPDATE の列内容ガード（第3ラウンド T-D1）
-- 背景: 0001/0004 の RLS は行所有（auth.uid() = user_id）のみを検証し、列の内容（topic 等）が
--       NULL/空でも通る。自分の行であっても不正な値を入れると集計・スケジューラが誤動作する。
--       既存ポリシーを「同名で」置き換え、WITH CHECK に topic 非空ガードを追加する（多層防御）。
-- 注: 既存と同じポリシー名を再定義することが重要。別名で追加すると Postgres の permissive ポリシーは
--     OR 評価のため、緩い既存ポリシーが残ってガードが無効化される。

-- answer_logs: INSERT 時に topic が非空であることを要求する（0001 の同名ポリシーを置換）。
drop policy if exists answer_logs_insert_own on public.answer_logs;
create policy answer_logs_insert_own on public.answer_logs
  for insert with check (
    auth.uid() = user_id
    and topic is not null and length(btrim(topic)) > 0
  );

-- review_states: INSERT 時に topic が非空であることを要求する（0001 の review_states_upsert_own を置換）。
drop policy if exists review_states_upsert_own on public.review_states;
create policy review_states_upsert_own on public.review_states
  for insert with check (
    auth.uid() = user_id
    and topic is not null and length(btrim(topic)) > 0
  );

-- review_states: UPDATE 時も topic 非空を要求する（0001 の review_states_update_own を置換）。
drop policy if exists review_states_update_own on public.review_states;
create policy review_states_update_own on public.review_states
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and topic is not null and length(btrim(topic)) > 0
  );

-- ── 可逆化ガイド（緊急 revert 用。0001 の所有のみポリシーへ戻す）─────────────────
-- drop policy if exists answer_logs_insert_own on public.answer_logs;
-- create policy answer_logs_insert_own on public.answer_logs
--   for insert with check (auth.uid() = user_id);
-- drop policy if exists review_states_upsert_own on public.review_states;
-- create policy review_states_upsert_own on public.review_states
--   for insert with check (auth.uid() = user_id);
-- drop policy if exists review_states_update_own on public.review_states;
-- create policy review_states_update_own on public.review_states
--   for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
