-- 紹介制度テーブル
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

-- profiles に招待コード・無料月カラムを追加（未存在の場合のみ）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS free_months_earned integer NOT NULL DEFAULT 0;

-- 招待コード自動生成トリガー用関数
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS trigger AS $$
DECLARE
  code text;
BEGIN
  LOOP
    code := 'GLH-' || upper(substring(md5(random()::text) from 1 for 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE invite_code = code);
  END LOOP;
  NEW.invite_code := code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 既存ユーザー全員に招待コードを付与
UPDATE profiles
SET invite_code = 'GLH-' || upper(substring(md5(user_id::text) from 1 for 5))
WHERE invite_code IS NULL;

-- 新規ユーザー登録時に招待コードを自動生成するトリガー
DROP TRIGGER IF EXISTS trg_set_invite_code ON profiles;
CREATE TRIGGER trg_set_invite_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.invite_code IS NULL)
  EXECUTE FUNCTION generate_invite_code();

-- 無料月加算 RPC
CREATE OR REPLACE FUNCTION increment_free_months(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET free_months_earned = free_months_earned + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
