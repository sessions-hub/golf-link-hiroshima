-- purposes 列を追加（既に存在する場合はスキップ）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS purposes text[] NOT NULL DEFAULT '{}';

-- 目的スコア計算ヘルパー（採点対象: ラウンド仲間・コンペ仲間・SNS・チャット）
CREATE OR REPLACE FUNCTION calc_purpose_score(purposes1 text[], purposes2 text[])
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT LEAST(10, (
    SELECT COUNT(*)::int * 5
    FROM unnest(ARRAY['ラウンド仲間','コンペ仲間','SNS','チャット']) AS p
    WHERE p = ANY(COALESCE(purposes1, '{}'))
      AND p = ANY(COALESCE(purposes2, '{}'))
  ));
$$;

-- 既存の calc_match_score に目的スコア (0-10pt) を追加
-- 既存7項目 (血液型25 + 干支20 + 年代20 + 性別10 + エリア15 + ハンデ10 + 頻度5 = max 105) は維持
CREATE OR REPLACE FUNCTION public.calc_match_score(p_user_id uuid, p_target_id uuid)
RETURNS numeric LANGUAGE plpgsql AS $function$
DECLARE
  p1          RECORD;
  p2          RECORD;
  score       NUMERIC := 0;
  age1        INTEGER;
  age2        INTEGER;
  age_diff    INTEGER;
  overlap     INTEGER;
  freq_order  TEXT[] := ARRAY['weekly_2plus','weekly_1','monthly_2_3','monthly_1','rarely'];
  i1          INTEGER;
  i2          INTEGER;
  z1          INTEGER;
  z2          INTEGER;
  z_diff      INTEGER;
  hdcp_diff   INTEGER;
  blood_table JSONB := '{"A":{"A":12,"B":5,"O":15,"AB":10},"B":{"A":5,"B":12,"O":15,"AB":10},"O":{"A":15,"B":15,"O":10,"AB":8},"AB":{"A":10,"B":10,"O":8,"AB":15}}';
BEGIN
  SELECT * INTO p1 FROM profiles WHERE user_id = p_user_id;
  SELECT * INTO p2 FROM profiles WHERE user_id = p_target_id;

  -- ① 血液型相性 (max 25)
  score := score + COALESCE(
    (blood_table -> p1.blood_type -> p2.blood_type)::NUMERIC, 10
  ) * 25 / 15;

  -- ② 干支相性 (max 20)
  z1 := EXTRACT(YEAR FROM p1.birth_date)::INTEGER % 12;
  z2 := EXTRACT(YEAR FROM p2.birth_date)::INTEGER % 12;
  z_diff := ABS(z1 - z2);
  score := score + CASE
    WHEN z_diff IN (4, 8)  THEN 20
    WHEN z_diff IN (1, 11) THEN 14
    WHEN z_diff = 0        THEN 10
    WHEN z_diff = 6        THEN 3
    ELSE 7
  END;

  -- ③ 年代 (max 20)
  IF p1.birth_date IS NOT NULL AND p2.birth_date IS NOT NULL THEN
    age1 := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - EXTRACT(YEAR FROM p1.birth_date)::INTEGER;
    age2 := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - EXTRACT(YEAR FROM p2.birth_date)::INTEGER;
    age_diff := ABS((age1 / 10) - (age2 / 10));
    score := score + CASE
      WHEN age_diff = 0 THEN 20
      WHEN age_diff = 1 THEN 12
      WHEN age_diff = 2 THEN 6
      ELSE 2
    END;
  ELSE
    score := score + 10;
  END IF;

  -- ④ 性別（異性+10、同性+5）(max 10)
  IF p1.gender IS NOT NULL AND p2.gender IS NOT NULL THEN
    IF p1.gender != p2.gender THEN score := score + 10;
    ELSE score := score + 5;
    END IF;
  ELSE
    score := score + 5;
  END IF;

  -- ⑤ エリア (max 15)
  IF p1.areas IS NOT NULL AND p2.areas IS NOT NULL THEN
    SELECT COUNT(*) INTO overlap
    FROM UNNEST(p1.areas) a
    WHERE a = ANY(p2.areas);
    score := score + CASE
      WHEN overlap > 0 THEN 15
      ELSE 3
    END;
  ELSE
    score := score + 5;
  END IF;

  -- ⑥ ハンデ差 (max 10)
  hdcp_diff := ABS(p1.handicap - p2.handicap);
  score := score + CASE
    WHEN hdcp_diff <= 5  THEN 10
    WHEN hdcp_diff <= 15 THEN 6
    WHEN hdcp_diff <= 25 THEN 3
    ELSE 1
  END;

  -- ⑦ ラウンド頻度 (max 5)
  i1 := ARRAY_POSITION(freq_order, p1.round_freq);
  i2 := ARRAY_POSITION(freq_order, p2.round_freq);
  score := score + CASE
    WHEN ABS(COALESCE(i1,3) - COALESCE(i2,3)) = 0 THEN 5
    WHEN ABS(COALESCE(i1,3) - COALESCE(i2,3)) = 1 THEN 3
    ELSE 1
  END;

  -- ⑧ 目的一致 (max 10) ← 追加
  score := score + calc_purpose_score(
    COALESCE(p1.purposes, '{}'),
    COALESCE(p2.purposes, '{}')
  );

  RETURN LEAST(100, ROUND(score, 1));
END;
$function$;
