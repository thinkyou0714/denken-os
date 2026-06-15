-- 0004: RLS補完・FK CASCADE・difficulty NOT NULL
-- DROP: see bottom of file

-- answer_logs: UPDATE/DELETE ポリシー追加（ユーザー所有データの完全制御）
drop policy if exists answer_logs_update_own on public.answer_logs;
create policy answer_logs_update_own on public.answer_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists answer_logs_delete_own on public.answer_logs;
create policy answer_logs_delete_own on public.answer_logs
  for delete using (auth.uid() = user_id);

-- review_states: DELETE ポリシー追加
drop policy if exists review_states_delete_own on public.review_states;
create policy review_states_delete_own on public.review_states
  for delete using (auth.uid() = user_id);

-- review_states.difficulty: NOT NULL + デフォルト値（FSRS 初期値 5.17）
-- 0001〜0003 では difficulty が nullable で、ストアもこの列を書かないため既存行に NULL が残りうる。
-- SET NOT NULL は1行でも NULL があると失敗するため、制約付与の前に既存 NULL を埋める（Codex#3 指摘）。
update public.review_states set difficulty = 5.17 where difficulty is null;
alter table public.review_states
  alter column difficulty set default 5.17,
  alter column difficulty set not null;

-- answer_logs.problem_id FK: ON DELETE SET NULL に変更（破損問題でも履歴を保持）
-- 注: 既存の無名制約を一度 drop してから再作成する必要がある。
--     Supabase/PG では制約名は pg_constraint で確認できる。
alter table public.answer_logs
  drop constraint if exists answer_logs_problem_id_fkey;
alter table public.answer_logs
  add constraint answer_logs_problem_id_fkey
    foreign key (problem_id) references public.problems (id) on delete set null;

-- -- DROP GUIDE (可逆化コメント):
-- drop policy if exists answer_logs_update_own on public.answer_logs;
-- drop policy if exists answer_logs_delete_own on public.answer_logs;
-- drop policy if exists review_states_delete_own on public.review_states;
-- alter table public.review_states alter column difficulty drop not null;
-- alter table public.review_states alter column difficulty drop default;
-- alter table public.answer_logs drop constraint if exists answer_logs_problem_id_fkey;
-- alter table public.answer_logs add constraint answer_logs_problem_id_fkey foreign key (problem_id) references public.problems (id);
