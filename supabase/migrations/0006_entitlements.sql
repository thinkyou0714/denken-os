-- 0006: 収益化 — entitlements（課金 tier）+ billing_events（webhook 冪等台帳）
-- 背景: 無料/Pro のフリーミアム gate に使う購読状態を保存する。設計方針（docs/monetization/ARCHITECTURE.md §A.3）:
--   - サーバが真実源。Stripe webhook が service_role で書き、ユーザーは自分の行のみ読める。
--   - 書きは service_role のみ（entitlements にユーザー write policy を作らない＝RLS で拒否、service_role が bypass）。
--   - 課金は既定 OFF（feature flag）で休眠。本 migration はスキーマのみで、実課金は発生しない。
-- 不変条件（tests/supabase/rls-mock.test.ts）: 全テーブル RLS 有効 / 所有表は auth.uid()=user_id /
--   using(true) 不在 / entitlements にユーザー write policy 無し / billing_events は policy ゼロ（deny-all）。

-- ── entitlements（ユーザー所有・本人 READ のみ）──────────────────────────────
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  status text not null default 'none'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'none')),
  source text not null default 'default' check (source in ('stripe', 'grant', 'default')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- Stripe webhook が customer から user を逆引きする経路のためのインデックス。
create index if not exists entitlements_stripe_customer_idx
  on public.entitlements (stripe_customer_id);

alter table public.entitlements enable row level security;

-- 本人は自分の entitlement のみ SELECT できる。
-- INSERT/UPDATE/DELETE policy は「作らない」ことが重要: 認証ユーザーには書き手段を与えず、
-- Stripe webhook が service_role（RLS を bypass）でのみ upsert する。
drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own on public.entitlements
  for select using (auth.uid() = user_id);

-- ── billing_events（webhook 冪等台帳・service_role 専用）────────────────────
-- Stripe event を event_id で 1 度だけ処理するための台帳。retry（at-least-once）での二重適用を防ぐ。
create table if not exists public.billing_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- RLS を有効化するが policy を 1 つも作らない = 認証/匿名ユーザーには deny-all。
-- service_role のみが RLS を bypass して読み書きできる（webhook 専用テーブル）。
alter table public.billing_events enable row level security;

-- ── 可逆化ガイド（緊急 revert 用）─────────────────────────────────────────────
-- drop policy if exists entitlements_select_own on public.entitlements;
-- drop table if exists public.billing_events;
-- drop table if exists public.entitlements;
