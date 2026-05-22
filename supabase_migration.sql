-- ===================================================
-- Migration: キャンセル機能追加
-- 実行場所: Supabase Dashboard > SQL Editor
-- ===================================================

-- 1. subscriptionsテーブルにカラム追加
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- 2. cancellation_feedbackテーブル作成
CREATE TABLE IF NOT EXISTS cancellation_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  other_text text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. RLS有効化
ALTER TABLE cancellation_feedback ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー
CREATE POLICY "Users can insert own feedback"
  ON cancellation_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON cancellation_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
