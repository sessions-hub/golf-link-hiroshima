-- ===================================================
-- Migration: フレンドグループチャット機能追加
-- 実行場所: Supabase Dashboard > SQL Editor
-- ===================================================

-- 1. friend_groups テーブル
CREATE TABLE IF NOT EXISTS public.friend_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. friend_group_members テーブル
CREATE TABLE IF NOT EXISTS public.friend_group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.friend_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- 3. friend_group_messages テーブル
CREATE TABLE IF NOT EXISTS public.friend_group_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.friend_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text,
  image_url text,
  file_url text,
  file_name text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ===================================================
-- RLS 有効化
-- ===================================================
ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_messages ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- 既存ポリシー・関数を削除（再実行時のエラー防止）
-- ===================================================
DROP POLICY IF EXISTS "friend_groups_select" ON public.friend_groups;
DROP POLICY IF EXISTS "friend_groups_insert" ON public.friend_groups;
DROP POLICY IF EXISTS "friend_group_members_select" ON public.friend_group_members;
DROP POLICY IF EXISTS "friend_group_members_insert" ON public.friend_group_members;
DROP POLICY IF EXISTS "friend_group_members_delete" ON public.friend_group_members;
DROP POLICY IF EXISTS "friend_group_messages_select" ON public.friend_group_messages;
DROP POLICY IF EXISTS "friend_group_messages_insert" ON public.friend_group_messages;
DROP FUNCTION IF EXISTS public.my_friend_group_ids();

-- ===================================================
-- SECURITY DEFINER ヘルパー関数
-- RLSをバイパスしてグループIDを取得することで循環参照を防ぐ
-- ===================================================
CREATE OR REPLACE FUNCTION public.my_friend_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT group_id FROM public.friend_group_members WHERE user_id = auth.uid()
$$;

-- ===================================================
-- friend_groups ポリシー
-- ===================================================
CREATE POLICY "friend_groups_select" ON public.friend_groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR id = ANY(ARRAY(SELECT public.my_friend_group_ids()))
  );

CREATE POLICY "friend_groups_insert" ON public.friend_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- ===================================================
-- friend_group_members ポリシー
-- ===================================================
CREATE POLICY "friend_group_members_select" ON public.friend_group_members
  FOR SELECT USING (
    group_id = ANY(ARRAY(SELECT public.my_friend_group_ids()))
  );

CREATE POLICY "friend_group_members_insert" ON public.friend_group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_groups
      WHERE friend_groups.id = friend_group_members.group_id
        AND friend_groups.created_by = auth.uid()
    )
  );

CREATE POLICY "friend_group_members_delete" ON public.friend_group_members
  FOR DELETE USING (user_id = auth.uid());

-- ===================================================
-- friend_group_messages ポリシー
-- ===================================================
CREATE POLICY "friend_group_messages_select" ON public.friend_group_messages
  FOR SELECT USING (
    group_id = ANY(ARRAY(SELECT public.my_friend_group_ids()))
  );

CREATE POLICY "friend_group_messages_insert" ON public.friend_group_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND group_id = ANY(ARRAY(SELECT public.my_friend_group_ids()))
  );

-- ===================================================
-- Realtime 有効化
-- ===================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_group_messages;
