-- ===================================================
-- Migration: コンペ募集締切日時カラム追加
-- 実行場所: Supabase Dashboard > SQL Editor
-- ===================================================

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS entry_deadline timestamptz;
