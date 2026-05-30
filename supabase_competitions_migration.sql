-- ===================================================
-- Migration: コンペ機能追加
-- 実行場所: Supabase Dashboard > SQL Editor
-- ===================================================

-- 1. competitionsテーブル作成
CREATE TABLE IF NOT EXISTS competitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  course_name text NOT NULL,
  comp_date date NOT NULL,
  format text NOT NULL DEFAULT 'ストロークプレー',
  max_players integer NOT NULL DEFAULT 24,
  fee integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'closed', 'finished')),
  image_url text,
  pdf_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. comp_entriesテーブル作成
CREATE TABLE IF NOT EXISTS comp_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comp_id uuid REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(comp_id, user_id)
);

-- 3. RLS有効化
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comp_entries ENABLE ROW LEVEL SECURITY;

-- 4. competitions RLSポリシー
CREATE POLICY "competitions_select_all"
  ON competitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "competitions_insert_own"
  ON competitions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "competitions_update_own"
  ON competitions FOR UPDATE TO authenticated
  USING (auth.uid() = organizer_id);

CREATE POLICY "competitions_delete_own"
  ON competitions FOR DELETE TO authenticated
  USING (auth.uid() = organizer_id);

-- 5. comp_entries RLSポリシー
CREATE POLICY "comp_entries_select_all"
  ON comp_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "comp_entries_insert_own"
  ON comp_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comp_entries_delete_own"
  ON comp_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 6. comp-filesストレージバケット（Supabase Dashboardで手動作成が必要な場合もあります）
-- Storage > Buckets > New bucket で「comp-files」を作成してください（Public: ON）

-- 7. ストレージRLSポリシー（comp-filesバケット）
INSERT INTO storage.buckets (id, name, public)
VALUES ('comp-files', 'comp-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "comp_files_select_all"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comp-files');

CREATE POLICY "comp_files_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comp-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "comp_files_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'comp-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "comp_files_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comp-files' AND (storage.foldername(name))[1] = auth.uid()::text);
