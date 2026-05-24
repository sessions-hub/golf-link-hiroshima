-- ポイント加算関数（原子的upsert＋日次リセット）
create or replace function public.add_user_points(
  p_user_id uuid,
  p_amount  integer
) returns void
language plpgsql
security definer
as $$
declare
  v_today date := current_date;
begin
  if auth.uid() != p_user_id then
    raise exception 'unauthorized';
  end if;

  insert into public.user_points (user_id, total_points, today_points, today_date)
  values (p_user_id, p_amount, p_amount, v_today)
  on conflict (user_id) do update
    set total_points = user_points.total_points + p_amount,
        today_points = case
                         when user_points.today_date = v_today
                         then user_points.today_points + p_amount
                         else p_amount
                       end,
        today_date   = v_today,
        updated_at   = now();
end;
$$;
