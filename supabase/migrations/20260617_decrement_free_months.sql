CREATE OR REPLACE FUNCTION decrement_free_months(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET free_months_earned = GREATEST(free_months_earned - 1, 0)
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
