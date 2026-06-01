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
-- 既存ポリシーを削除（再実行時のエラー防止）
-- ===================================================
DROP POLICY IF EXISTS "friend_groups_select" ON public.friend_groups;
DROP POLICY IF EXISTS "friend_groups_insert" ON public.friend_groups;
DROP POLICY IF EXISTS "friend_group_members_select" ON public.friend_group_members;
DROP POLICY IF EXISTS "friend_group_members_insert" ON public.friend_group_members;
DROP POLICY IF EXISTS "friend_group_members_delete" ON public.friend_group_members;
DROP POLICY IF EXISTS "friend_group_messages_select" ON public.friend_group_messages;
DROP POLICY IF EXISTS "friend_group_messages_insert" ON public.friend_group_messages;

-- ===================================================
-- friend_groups ポリシー
-- ===================================================

-- 作成者 OR メンバーが参照可能
-- ※ created_by = auth.uid() を含めることで、グループ作成直後（メンバー未登録時）
--   に friend_group_members_insert ポリシーの EXISTS サブクエリが通る
CREATE POLICY "friend_groups_select" ON public.friend_groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE friend_group_members.group_id = friend_groups.id
        AND friend_group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "friend_groups_insert" ON public.friend_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- ===================================================
-- friend_group_members ポリシー
-- ===================================================

-- 自分のメンバーシップ OR 同じグループのメンバー全員を参照可能
CREATE POLICY "friend_group_members_select" ON public.friend_group_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_groups
      WHERE friend_groups.id = friend_group_members.group_id
        AND (
          friend_groups.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.friend_group_members AS m2
            WHERE m2.group_id = friend_group_members.group_id
              AND m2.user_id = auth.uid()
          )
        )
    )
  );

-- グループ作成者がメンバーを追加可能（自分自身の追加も含む）
CREATE POLICY "friend_group_members_insert" ON public.friend_group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.friend_groups
      WHERE friend_groups.id = friend_group_members.group_id
        AND friend_groups.created_by = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "friend_group_members_delete" ON public.friend_group_members
  FOR DELETE USING (user_id = auth.uid());

-- ===================================================
-- friend_group_messages ポリシー
-- ===================================================

CREATE POLICY "friend_group_messages_select" ON public.friend_group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE friend_group_members.group_id = friend_group_messages.group_id
        AND friend_group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "friend_group_messages_insert" ON public.friend_group_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE friend_group_members.group_id = friend_group_messages.group_id
        AND friend_group_members.user_id = auth.uid()
    )
  );

-- ===================================================
-- Realtime 有効化
-- ===================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_group_messages;
