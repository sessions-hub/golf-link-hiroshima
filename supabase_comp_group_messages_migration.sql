-- comp_group_messages テーブル作成
CREATE TABLE IF NOT EXISTS public.comp_group_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comp_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text,
  image_url text,
  file_url text,
  file_name text,
  created_at timestamptz DEFAULT now()
);

-- RLS 有効化
ALTER TABLE public.comp_group_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: 参加者または主催者のみ
CREATE POLICY "comp_group_messages_select" ON public.comp_group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.comp_entries
      WHERE comp_entries.comp_id = comp_group_messages.comp_id
        AND comp_entries.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.competitions
      WHERE competitions.id = comp_group_messages.comp_id
        AND competitions.organizer_id = auth.uid()
    )
  );

-- INSERT: 参加者または主催者のみ（自分のIDのみ挿入可）
CREATE POLICY "comp_group_messages_insert" ON public.comp_group_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.comp_entries
        WHERE comp_entries.comp_id = comp_group_messages.comp_id
          AND comp_entries.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.competitions
        WHERE competitions.id = comp_group_messages.comp_id
          AND competitions.organizer_id = auth.uid()
      )
    )
  );

-- Realtime 有効化
ALTER PUBLICATION supabase_realtime ADD TABLE public.comp_group_messages;
