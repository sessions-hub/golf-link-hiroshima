-- post_notifications.type の CHECK 制約に friend_match を追加
ALTER TABLE public.post_notifications
  DROP CONSTRAINT IF EXISTS post_notifications_type_check;

ALTER TABLE public.post_notifications
  ADD CONSTRAINT post_notifications_type_check
  CHECK (type IN ('like','comment','follow','friend_match'));
