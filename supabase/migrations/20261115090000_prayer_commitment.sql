-- Prayer commitment: hours to pray each week.
-- Altars have a weekly commitment and no target. Prayers keep their target and gain a weekly commitment.
-- Only test entries existed, so any altar target is cleared rather than kept.

alter table public.prayers
  add column commitment_hours numeric(5,1),
  add column commitment_set_at timestamptz,
  add constraint prayers_commitment_hours_range
    check (commitment_hours is null or (commitment_hours >= 0.5 and commitment_hours <= 168));

update public.prayers set target_hours = null where kind = 'altar' and target_hours is not null;

alter table public.prayers
  add constraint prayers_altar_has_no_target check (kind <> 'altar' or target_hours is null);

-- save_prayer gains the commitment. The old version is replaced, so there is only one.
drop function public.save_prayer(uuid, text, text, integer, date, date, jsonb, jsonb);

create function public.save_prayer(
  prayer_id uuid,
  kind text,
  title text,
  target_hours integer,
  planned_start_date date,
  planned_end_date date,
  points jsonb,       -- [{ "id": uuid, "body": text }, ...] in display order
  scriptures jsonb,   -- [{ "id": uuid, "reference": text, "verse_text": text, "translation": text }, ...]
  commitment_hours numeric default null  -- hours to pray each week; null for none
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := save_prayer.prayer_id;
  v_points jsonb := coalesce(save_prayer.points, '[]'::jsonb);
  v_scriptures jsonb := coalesce(save_prayer.scriptures, '[]'::jsonb);
  v_point_ids uuid[];
  v_scripture_ids uuid[];
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;
  if v_id is null then
    raise exception 'A prayer id is required.' using errcode = '22004';
  end if;
  if jsonb_typeof(v_points) <> 'array' or jsonb_typeof(v_scriptures) <> 'array' then
    raise exception 'Points and scriptures must be lists.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_points) > 20 then
    raise exception 'A prayer can have up to 20 prayer points.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_scriptures) > 10 then
    raise exception 'A prayer can have up to 10 key scriptures.' using errcode = '22023';
  end if;

  -- Create the prayer, or update it. The type is set once, when it is created.
  insert into public.prayers as p
    (id, owner_id, kind, title, target_hours, planned_start_date, planned_end_date,
     commitment_hours, commitment_set_at)
  values
    (v_id, v_uid, coalesce(save_prayer.kind, 'prayer'), btrim(save_prayer.title),
     save_prayer.target_hours, save_prayer.planned_start_date, save_prayer.planned_end_date,
     save_prayer.commitment_hours,
     case when save_prayer.commitment_hours is not null then now() end)
  on conflict on constraint prayers_pkey do update
    set title = excluded.title,
        target_hours = excluded.target_hours,
        planned_start_date = excluded.planned_start_date,
        planned_end_date = excluded.planned_end_date,
        commitment_hours = excluded.commitment_hours,
        -- Weeks are counted from when the commitment was last changed.
        commitment_set_at = case
          when excluded.commitment_hours is null then null
          when p.commitment_hours is distinct from excluded.commitment_hours then now()
          else p.commitment_set_at end
    where p.owner_id = v_uid;

  if not found then
    raise exception 'Only the owner can change this prayer.' using errcode = '42501';
  end if;

  -- Prayer points: remove the ones no longer listed, then add or update the rest in order.
  select coalesce(array_agg((e ->> 'id')::uuid), '{}') into v_point_ids
  from jsonb_array_elements(v_points) e;

  delete from public.prayer_points pp
  where pp.prayer_id = v_id and pp.id <> all (v_point_ids);

  insert into public.prayer_points as pp (id, prayer_id, body, position)
  select (e.value ->> 'id')::uuid, v_id, btrim(e.value ->> 'body'), (e.ordinality - 1)::integer
  from jsonb_array_elements(v_points) with ordinality e
  on conflict on constraint prayer_points_pkey do update
    set body = excluded.body, position = excluded.position
    where pp.prayer_id = v_id;

  -- Every listed point must now belong to this prayer. If one did not land, its id is already
  -- used by another prayer, and the whole save is refused rather than half done.
  if (select count(*) from public.prayer_points pp where pp.prayer_id = v_id) <> jsonb_array_length(v_points) then
    raise exception 'A prayer point could not be saved.' using errcode = '42501';
  end if;

  -- Key scriptures: the same.
  select coalesce(array_agg((e ->> 'id')::uuid), '{}') into v_scripture_ids
  from jsonb_array_elements(v_scriptures) e;

  delete from public.scriptures s
  where s.prayer_id = v_id and s.id <> all (v_scripture_ids);

  insert into public.scriptures as s (id, prayer_id, reference, verse_text, translation, position)
  select (e.value ->> 'id')::uuid, v_id, btrim(e.value ->> 'reference'),
         nullif(btrim(e.value ->> 'verse_text'), ''), nullif(btrim(e.value ->> 'translation'), ''),
         (e.ordinality - 1)::integer
  from jsonb_array_elements(v_scriptures) with ordinality e
  on conflict on constraint scriptures_pkey do update
    set reference = excluded.reference, verse_text = excluded.verse_text,
        translation = excluded.translation, position = excluded.position
    where s.prayer_id = v_id;

  if (select count(*) from public.scriptures s where s.prayer_id = v_id) <> jsonb_array_length(v_scriptures) then
    raise exception 'A key scripture could not be saved.' using errcode = '42501';
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_prayer(uuid, text, text, integer, date, date, jsonb, jsonb, numeric) from public, anon;
grant execute on function public.save_prayer(uuid, text, text, integer, date, date, jsonb, jsonb, numeric) to authenticated;

-- How a person is doing against a prayer's weekly commitment. Weeks start on Sunday in the time zone given.
-- It reads only the caller's own stretches (through row level security), so it shows nobody else's hours.
-- Shortfall: the hours short of the commitment over the weeks that have finished. It does not carry into the
-- next week's target, and time prayed beyond a week's commitment pays it down. The current week never counts
-- as short until it is over.
create function public.get_my_commitment_status(prayer_id uuid, tz text default 'UTC')
returns table (commitment_hours numeric, completed_weeks integer, this_week_seconds bigint, shortfall_seconds bigint)
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_commit numeric;
  v_set timestamptz;
  v_joined timestamptz;
  v_now_local timestamp;
  v_week_local timestamp;
  v_first_local timestamp;
  v_week_start timestamptz;
  v_first_start timestamptz;
  v_completed integer;
  v_total bigint;
  v_this bigint;
  v_goal bigint;
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  select p.commitment_hours, p.commitment_set_at into v_commit, v_set
  from public.prayers p where p.id = get_my_commitment_status.prayer_id;
  -- Not visible to the caller, or no commitment: nothing to report.
  if not found or v_commit is null then
    return;
  end if;

  select m.joined_at into v_joined
  from public.prayer_members m
  where m.prayer_id = get_my_commitment_status.prayer_id and m.user_id = v_uid;

  v_now_local := now() at time zone get_my_commitment_status.tz;
  -- date_trunc starts weeks on Monday, so shift by a day to start them on Sunday.
  v_week_local := date_trunc('week', v_now_local + interval '1 day') - interval '1 day';
  v_first_local := date_trunc(
    'week',
    (greatest(coalesce(v_set, now()), coalesce(v_joined, now())) at time zone get_my_commitment_status.tz) + interval '1 day'
  ) - interval '1 day';
  v_week_start := v_week_local at time zone get_my_commitment_status.tz;
  v_first_start := v_first_local at time zone get_my_commitment_status.tz;
  v_completed := greatest(0, (v_week_local::date - v_first_local::date) / 7);

  select coalesce(sum(s.credited_seconds), 0),
         coalesce(sum(s.credited_seconds) filter (where s.ended_at >= v_week_start), 0)
  into v_total, v_this
  from public.prayer_sessions s
  where s.prayer_id = get_my_commitment_status.prayer_id
    and s.user_id = v_uid
    and s.ended_at >= v_first_start;

  v_goal := round(v_commit * 3600)::bigint;
  commitment_hours := v_commit;
  completed_weeks := v_completed;
  this_week_seconds := v_this;
  -- Hours beyond this week's commitment count towards earlier weeks; the rest of this week does not yet.
  shortfall_seconds := greatest(0, v_goal * v_completed - (v_total - least(v_this, v_goal)));
  return next;
end;
$$;

revoke all on function public.get_my_commitment_status(uuid, text) from public, anon;
grant execute on function public.get_my_commitment_status(uuid, text) to authenticated;
