-- problems に params 列を追加（STORE-1: 行⇔ドメインのドリフト解消）。
-- 0001 の problems テーブルは params 列を持たず、SupabaseProblemStore が params を黙って捨てていた。
-- params は係数と realistic_range を保持し、再読込時の数値健全性（value∈realistic_range）検証に必要。
-- File ストアは JSON 全体を保存するため params が残り、Supabase だけ欠落していた parity 破れを塞ぐ。
alter table public.problems
  add column if not exists params jsonb;
