-- friend_match 通知の重複を DB レベルで防ぐ partial unique index
-- like/comment は同一ペアで複数件あり得るため WHERE でスコープを限定
CREATE UNIQUE INDEX IF NOT EXISTS post_notifications_friend_match_unique
  ON post_notifications (user_id, actor_id)
  WHERE type = 'friend_match';
