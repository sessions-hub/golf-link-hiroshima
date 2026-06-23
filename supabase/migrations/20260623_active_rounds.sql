-- 進行中ラウンド一時保存テーブル
-- 完成したラウンドは scorecards へ昇格し、この行は削除する
-- user_id に UNIQUE 制約 → 1アカウント1件のみ進行中を持てる

CREATE TABLE IF NOT EXISTS public.active_rounds (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source           text        NOT NULL CHECK (source IN ('gps', 'manual')),
  venue_name       text        NOT NULL,
  course_name      text        NOT NULL,
  course_id        text,
  combo_label      text,
  combo_course_ids text[],
  hole_scores      integer[]   NOT NULL DEFAULT '{}',
  hole_count       integer     NOT NULL,
  current_hole     integer,
  round_date       date        NOT NULL,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- RLS 有効化
ALTER TABLE public.active_rounds ENABLE ROW LEVEL SECURITY;

-- 自分の行のみ SELECT 可
CREATE POLICY "active_rounds_select_own"
  ON public.active_rounds FOR SELECT
  USING (auth.uid() = user_id);

-- 自分の行のみ INSERT 可（user_id を自分以外で挿入させない）
CREATE POLICY "active_rounds_insert_own"
  ON public.active_rounds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分の行のみ UPDATE 可
CREATE POLICY "active_rounds_update_own"
  ON public.active_rounds FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 自分の行のみ DELETE 可
CREATE POLICY "active_rounds_delete_own"
  ON public.active_rounds FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 自動更新関数（汎用。他テーブルでも使い回せる）
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- active_rounds の UPDATE 前に updated_at を自動セット
DROP TRIGGER IF EXISTS trg_active_rounds_updated_at ON public.active_rounds;
CREATE TRIGGER trg_active_rounds_updated_at
  BEFORE UPDATE ON public.active_rounds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
