-- 全体を単一の DO ブロックにまとめることで
-- Supabase SQL ランナーの $$ 終端後パース誤りを回避する
DO $setup$
BEGIN

  -- partial unique index（冪等）
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'post_notifications'
      AND indexname  = 'post_notifications_friend_match_unique'
  ) THEN
    EXECUTE $q$
      CREATE UNIQUE INDEX post_notifications_friend_match_unique
        ON public.post_notifications (user_id, actor_id)
        WHERE type = 'friend_match'
    $q$;
  END IF;

  -- -------------------------------------------------------
  -- 関数1: favorites INSERT 後、相互成立なら friend_match 通知を双方向作成
  -- -------------------------------------------------------
  EXECUTE $q$
    CREATE OR REPLACE FUNCTION public.handle_mutual_favorite()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM public.favorites
        WHERE user_id = NEW.target_id AND target_id = NEW.user_id
      ) THEN
        DELETE FROM public.post_notifications
        WHERE type = 'friend_match'
          AND (
            (user_id = NEW.user_id   AND actor_id = NEW.target_id)
         OR (user_id = NEW.target_id AND actor_id = NEW.user_id)
          );
        INSERT INTO public.post_notifications (user_id, actor_id, type)
        VALUES
          (NEW.user_id,   NEW.target_id, 'friend_match'),
          (NEW.target_id, NEW.user_id,   'friend_match')
        ON CONFLICT (user_id, actor_id) WHERE type = 'friend_match' DO NOTHING;
      END IF;
      RETURN NEW;
    END;
    $$
  $q$;

  EXECUTE $q$ DROP TRIGGER IF EXISTS on_mutual_favorite ON public.favorites $q$;
  EXECUTE $q$
    CREATE TRIGGER on_mutual_favorite
      AFTER INSERT ON public.favorites
      FOR EACH ROW EXECUTE FUNCTION public.handle_mutual_favorite()
  $q$;

  -- -------------------------------------------------------
  -- 関数2: favorites DELETE 後、friend_match 通知を削除（再フレンドで再通知）
  -- -------------------------------------------------------
  EXECUTE $q$
    CREATE OR REPLACE FUNCTION public.handle_unfavorite()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      DELETE FROM public.post_notifications
      WHERE type = 'friend_match'
        AND (
          (user_id = OLD.user_id   AND actor_id = OLD.target_id)
       OR (user_id = OLD.target_id AND actor_id = OLD.user_id)
        );
      RETURN OLD;
    END;
    $$
  $q$;

  EXECUTE $q$ DROP TRIGGER IF EXISTS on_unfavorite ON public.favorites $q$;
  EXECUTE $q$
    CREATE TRIGGER on_unfavorite
      AFTER DELETE ON public.favorites
      FOR EACH ROW EXECUTE FUNCTION public.handle_unfavorite()
  $q$;

END;
$setup$;
