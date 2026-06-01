-- 0002: problems.updated_at を UPDATE 時に自動更新する。
-- 0001 では default now() のみで、行更新時に updated_at が変わらなかった（更新時刻が誤って固定）。
-- 既存マイグレーションは改変せず、追加マイグレーションで是正する。

-- search_path を固定（Supabase のベストプラクティス: 関数の可変 search_path を塞ぐ）。
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists problems_set_updated_at on public.problems;
create trigger problems_set_updated_at
  before update on public.problems
  for each row execute function public.set_updated_at();
