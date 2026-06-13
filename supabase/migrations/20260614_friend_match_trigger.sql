-- favorites AFTER INSERT：相互成立時に friend_match 通知を双方向作成
-- SECURITY DEFINER で RLS をバイパスし、相手側の user_id へも INSERT 可能
CREATE OR REPLACE FUNCTION public.handle_mutual_favorite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.favorites
    WHERE user_id = NEW.target_id AND target_id = NEW.user_id
  ) THEN
    -- 再フレンドで再通知させるため既存の friend_match 通知を削除してから作成
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
$$;

CREATE OR REPLACE TRIGGER on_mutual_favorite
  AFTER INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.handle_mutual_favorite();

-- favorites AFTER DELETE：フォロー解除で friend_match 通知を削除
-- → 再フォロー→相互成立で再び通知が届く
CREATE OR REPLACE FUNCTION public.handle_unfavorite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.post_notifications
  WHERE type = 'friend_match'
    AND (
      (user_id = OLD.user_id   AND actor_id = OLD.target_id)
   OR (user_id = OLD.target_id AND actor_id = OLD.user_id)
    );
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER on_unfavorite
  AFTER DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.handle_unfavorite();
