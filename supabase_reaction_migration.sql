-- ===================================================
-- Migration: リアクション機能追加
-- 実行場所: Supabase Dashboard > SQL Editor
-- ===================================================

-- 1. message_reactions テーブル作成
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read message reactions"
  ON message_reactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own message reactions"
  ON message_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own message reactions"
  ON message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. comment_reactions テーブル作成
CREATE TABLE IF NOT EXISTS comment_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(comment_id, user_id, emoji)
);

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read comment reactions"
  ON comment_reactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comment reactions"
  ON comment_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment reactions"
  ON comment_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
