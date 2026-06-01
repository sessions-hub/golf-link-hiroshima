-- ===================================================
-- Migration: フレンドグループチャット機能追加
-- 実行場所: Supabase Dashboard > SQL Editor
-- ===================================================

CREATE TABLE IF NOT EXISTS public.friend_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friend_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.friend_group_members
  ADD CONSTRAINT IF NOT EXISTS friend_group_members_unique UNIQUE (group_id, user_id);

CREATE TABLE IF NOT EXISTS public.friend_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  image_url text,
  file_url text,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friend_groups_select" ON public.friend_groups;
DROP POLICY IF EXISTS "friend_groups_insert" ON public.friend_groups;
DROP POLICY IF EXISTS "friend_group_members_select" ON public.friend_group_members;
DROP POLICY IF EXISTS "friend_group_members_insert" ON public.friend_group_members;
DROP POLICY IF EXISTS "friend_group_members_delete" ON public.friend_group_members;
DROP POLICY IF EXISTS "friend_group_messages_select" ON public.friend_group_messages;
DROP POLICY IF EXISTS "friend_group_messages_insert" ON public.friend_group_messages;
DROP FUNCTION IF EXISTS public.my_friend_group_ids();

CREATE POLICY "friend_groups_select" ON public.friend_groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_group_members m
      WHERE m.group_id = friend_groups.id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "friend_groups_insert" ON public.friend_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "friend_group_members_select" ON public.friend_group_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "friend_group_members_insert" ON public.friend_group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_groups g
      WHERE g.id = friend_group_members.group_id
        AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "friend_group_members_delete" ON public.friend_group_members
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "friend_group_messages_select" ON public.friend_group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_members m
      WHERE m.group_id = friend_group_messages.group_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "friend_group_messages_insert" ON public.friend_group_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.friend_group_members m
      WHERE m.group_id = friend_group_messages.group_id
        AND m.user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_group_messages;
