-- 記述式(descriptive)の部分点ルーブリックを problems に追加（15-descriptive-secondary）。
-- 0001 以降に lib/engine/schema.ts へ追加された rubric 列を DB へ反映する
-- （行⇔ドメインのドリフト解消。記述問題の往復で rubric が失われないようにする）。
alter table public.problems
  add column if not exists rubric jsonb;
