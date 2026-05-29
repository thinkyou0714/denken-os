-- DENKEN-OS 初期スキーマ（README ロードマップ M2 / docs/automation/05）。
-- lib/store のインターフェース（ProblemStore / AnswerLogStore / ReviewStateStore）に対応。
-- ベストプラクティス: 公開テーブルは RLS を必ず有効化し、ユーザー所有データは auth.uid() で制限。
--   ポリシー列にはインデックスを張り、UPDATE は SELECT ポリシーと対で用意する。

-- ── 問題（公開読み取り。書き込みは管理者/サービスロールのみ）────────────────
create table if not exists public.problems (
  id          text primary key,                 -- 例: T-0127
  exam        text,
  subject     text not null,
  topic       text not null,
  format      text not null default 'multiple_choice',
  difficulty  int  not null check (difficulty between 1 and 5),
  statement   text not null,
  choices     jsonb,
  answer      text not null,
  solution    jsonb not null,
  validation  jsonb not null,
  source      jsonb not null,
  stats       jsonb,
  status      text not null default 'draft'
              check (status in ('draft','validated','published','retracted')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists problems_topic_idx  on public.problems (topic);
create index if not exists problems_status_idx on public.problems (status);

alter table public.problems enable row level security;

-- 公開されている問題だけ誰でも閲覧可能。
drop policy if exists problems_public_read on public.problems;
create policy problems_public_read on public.problems
  for select using (status = 'published');
-- 書き込みはサービスロール（CI/管理バッチ）に限定 → ブラウザ anon からは不可。

-- ── 解答ログ（ユーザー所有）──────────────────────────────────────────────
create table if not exists public.answer_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  problem_id  text references public.problems (id),
  topic       text not null,
  correct     boolean not null,
  time_ms     int,
  answered_at timestamptz not null default now()
);
create index if not exists answer_logs_user_idx on public.answer_logs (user_id);

alter table public.answer_logs enable row level security;

drop policy if exists answer_logs_select_own on public.answer_logs;
create policy answer_logs_select_own on public.answer_logs
  for select using (auth.uid() = user_id);
drop policy if exists answer_logs_insert_own on public.answer_logs;
create policy answer_logs_insert_own on public.answer_logs
  for insert with check (auth.uid() = user_id);

-- ── 記憶状態（ユーザー×論点。FSRS/SM-2 のスケジューラ状態）──────────────────
create table if not exists public.review_states (
  user_id        uuid not null references auth.users (id) on delete cascade,
  topic          text not null,
  reps           int  not null default 0,
  lapses         int  not null default 0,
  interval_days  numeric not null default 0,
  ease           numeric not null default 2.5,
  -- FSRS 用（任意）
  stability      numeric,
  difficulty     numeric,
  due_at         timestamptz not null default now(),
  last_review_at timestamptz,
  primary key (user_id, topic)
);
create index if not exists review_states_user_idx on public.review_states (user_id);
create index if not exists review_states_due_idx  on public.review_states (user_id, due_at);

alter table public.review_states enable row level security;

-- UPDATE は SELECT ポリシーと対で（USING 句評価のため）。
drop policy if exists review_states_select_own on public.review_states;
create policy review_states_select_own on public.review_states
  for select using (auth.uid() = user_id);
drop policy if exists review_states_upsert_own on public.review_states;
create policy review_states_upsert_own on public.review_states
  for insert with check (auth.uid() = user_id);
drop policy if exists review_states_update_own on public.review_states;
create policy review_states_update_own on public.review_states
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
