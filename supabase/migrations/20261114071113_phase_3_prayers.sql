-- Stretch v1, phase 3: a plan on each prayer, and one all-or-nothing save.

-- 1. The plan: an optional target of hours and an optional end date.
alter table public.prayers
  add column target_hours integer,
  add column planned_end_date date,
  add constraint prayers_target_hours_range
    check (target_hours is null or target_hours between 1 and 10000),
  add constraint prayers_plan_dates_ordered
    check (planned_end_date is null
           or (planned_start_date is not null and planned_end_date >= planned_start_date));

-- 2. Save a prayer with its points and scriptures in one transaction.
--    Runs with the caller's permissions, so RLS decides what is allowed.
--    The phone supplies every id, so a retry after a dropped connection changes nothing.
create function public.save_prayer(
  prayer_id uuid,
  kind text,
  title text,
  target_hours integer,
  planned_start_date date,
  planned_end_date date,
  points jsonb,       -- [{ "id": uuid, "body": text }, ...] in display order
  scriptures jsonb    -- [{ "id": uuid, "reference": text, "verse_text": text, "translation": text }, ...]
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
    (id, owner_id, kind, title, target_hours, planned_start_date, planned_end_date)
  values
    (v_id, v_uid, coalesce(save_prayer.kind, 'prayer'), btrim(save_prayer.title),
     save_prayer.target_hours, save_prayer.planned_start_date, save_prayer.planned_end_date)
  on conflict on constraint prayers_pkey do update
    set title = excluded.title,
        target_hours = excluded.target_hours,
        planned_start_date = excluded.planned_start_date,
        planned_end_date = excluded.planned_end_date
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

revoke all on function public.save_prayer(uuid, text, text, integer, date, date, jsonb, jsonb) from public, anon;
grant execute on function public.save_prayer(uuid, text, text, integer, date, date, jsonb, jsonb) to authenticated;
