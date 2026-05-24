-- ユーザーポイントテーブル
-- Supabase SQL Editor で実行してください

create table if not exists public.user_points (
  user_id     uuid    primary key references auth.users(id) on delete cascade,
  total_points integer not null default 0,
  today_points integer not null default 0,
  today_date   date    not null default current_date,
  updated_at   timestamptz not null default now()
);

alter table public.user_points enable row level security;

-- 全認証ユーザーが全ポイントを参照可能（個人・他人ページのLv表示のため）
create policy "user_points_select_all"
  on public.user_points for select
  using (true);

-- 本人のみ自分のポイントを更新可能
create policy "user_points_write_own"
  on public.user_points for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
