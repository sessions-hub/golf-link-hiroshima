-- Migration: competitionsテーブルにtype列を追加
-- 実行場所: Supabase Dashboard > SQL Editor

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'comp';
