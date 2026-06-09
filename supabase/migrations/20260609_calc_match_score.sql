-- purposes 列を追加（既に存在する場合はスキップ）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS purposes text[] NOT NULL DEFAULT '{}';

-- 目的スコア計算（採点対象: ラウンド仲間・コンペ仲間・SNS・チャット のみ）
CREATE OR REPLACE FUNCTION calc_purpose_score(purposes1 text[], purposes2 text[])
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT LEAST(10, (
    SELECT COUNT(*)::int * 5
    FROM unnest(ARRAY['ラウンド仲間','コンペ仲間','SNS','チャット']) AS p
    WHERE p = ANY(COALESCE(purposes1, '{}'))
      AND p = ANY(COALESCE(purposes2, '{}'))
  ));
$$;

-- マッチスコア全体計算
-- 内訳: 目的(0-10) + ハンディキャップ(0-25) + エリア(0-25) + 曜日(0-20) + 年代(0-10) + 血液型(0-10) ≤ 100
CREATE OR REPLACE FUNCTION calc_match_score(p_user1 uuid, p_user2 uuid)
RETURNS int LANGUAGE plpgsql STABLE AS $$
DECLARE
  r1 RECORD;
  r2 RECORD;
  v_purpose  int;
  v_handicap int;
  v_area     int;
  v_day      int;
  v_age      int;
  v_blood    int;
  hdcp_diff  int;
  day_count  int;
  age1       int;
  age2       int;
BEGIN
  SELECT handicap, preferred_days, area_id, birth_date, blood_type, purposes
    INTO r1 FROM profiles WHERE user_id = p_user1;
  SELECT handicap, preferred_days, area_id, birth_date, blood_type, purposes
    INTO r2 FROM profiles WHERE user_id = p_user2;

  IF r1 IS NULL OR r2 IS NULL THEN RETURN 0; END IF;

  -- 目的スコア (0-10)
  v_purpose := calc_purpose_score(r1.purposes, r2.purposes);

  -- ハンディキャップスコア (0-25)
  hdcp_diff := ABS(COALESCE(r1.handicap, 18) - COALESCE(r2.handicap, 18));
  v_handicap := CASE
    WHEN hdcp_diff <= 5  THEN 25
    WHEN hdcp_diff <= 10 THEN 20
    WHEN hdcp_diff <= 20 THEN 10
    ELSE 5
  END;

  -- エリアスコア (0-25)
  v_area := CASE
    WHEN r1.area_id IS NOT NULL AND r1.area_id = r2.area_id THEN 25
    ELSE 0
  END;

  -- 希望曜日スコア (0-20)
  SELECT COUNT(*)::int INTO day_count
  FROM unnest(COALESCE(r1.preferred_days, '{}')) d
  WHERE d = ANY(COALESCE(r2.preferred_days, '{}'));
  v_day := LEAST(20, day_count * 7);

  -- 年代スコア (0-10)
  age1 := EXTRACT(YEAR FROM age(now(), COALESCE(r1.birth_date, '1985-01-01'::date)))::int / 10;
  age2 := EXTRACT(YEAR FROM age(now(), COALESCE(r2.birth_date, '1985-01-01'::date)))::int / 10;
  v_age := CASE
    WHEN ABS(age1 - age2) = 0 THEN 10
    WHEN ABS(age1 - age2) = 1 THEN 5
    ELSE 0
  END;

  -- 血液型スコア (0-10)
  v_blood := CASE
    WHEN r1.blood_type IN ('A','O')  AND r2.blood_type IN ('A','O')  THEN 10
    WHEN r1.blood_type = 'B'         AND r2.blood_type IN ('B','O')  THEN 10
    WHEN r2.blood_type = 'B'         AND r1.blood_type IN ('B','O')  THEN 10
    WHEN r1.blood_type = 'AB' OR r2.blood_type = 'AB'               THEN 7
    ELSE 5
  END;

  RETURN LEAST(100, v_purpose + v_handicap + v_area + v_day + v_age + v_blood);
END;
$$;
