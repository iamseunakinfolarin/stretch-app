-- Stretch v1: functions the app calls

-- 1. ping: the only function signed-out users may call
create function public.ping()
returns text language sql stable set search_path = '' as $$
  select 'ok'::text;
$$;

-- Internal: 8 characters from A-Z and 2-9 without I and O (32 symbols, 5 random bits each).
-- Uses the random bytes of gen_random_uuid(), skipping the bytes that hold fixed bits.
create function public.generate_invite_code()
returns text language sql volatile set search_path = '' as $$
  select string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(b.bytes, i.idx) & 31) + 1, 1),
           '')
  from (select uuid_send(gen_random_uuid()) as bytes) b,
       unnest(array[0, 1, 2, 3, 4, 5, 10, 11]) as i (idx);
$$;

-- 2. create_or_reset_invite: owner only; replaces any existing code
create function public.create_or_reset_invite(prayer_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.prayers p
    where p.id = create_or_reset_invite.prayer_id and p.owner_id = v_uid
  ) then
    raise exception 'Only the owner of this prayer can manage its invite code.'
      using errcode = '42501';
  end if;

  loop
    v_code := public.generate_invite_code();
    begin
      insert into public.prayer_invites as i (prayer_id, code, created_by)
      values (create_or_reset_invite.prayer_id, v_code, v_uid)
      on conflict on constraint prayer_invites_pkey
      do update set code = excluded.code, created_by = excluded.created_by;
      exit;
    exception when unique_violation then
      null; -- the code is already used by another prayer: try a new one
    end;
  end loop;

  return v_code;
end;
$$;

-- 3. join_prayer_by_code
create function public.join_prayer_by_code(code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(join_prayer_by_code.code));
  v_prayer_id uuid;
  v_status text;
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  select i.prayer_id, p.status into v_prayer_id, v_status
  from public.prayer_invites i
  join public.prayers p on p.id = i.prayer_id
  where i.code = v_code;

  if v_prayer_id is null then
    raise exception 'That invite code is not valid. Check the code and try again.'
      using errcode = 'ST001';
  end if;
  if v_status = 'archived' then
    raise exception 'This prayer has been archived and can no longer be joined.'
      using errcode = 'ST002';
  end if;

  insert into public.prayer_members (prayer_id, user_id, role)
  values (v_prayer_id, v_uid, 'member')
  on conflict on constraint prayer_members_pkey do nothing;

  return v_prayer_id;
end;
$$;

-- 4. complete_session: runs with the caller's permissions, so RLS applies
create function public.complete_session(
  id uuid,
  prayer_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  credited_seconds integer,
  check_ins_shown integer default 0,
  check_ins_confirmed integer default 0,
  note_id uuid default null,
  note_body text default null,
  note_visibility text default 'personal'
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;
  if complete_session.id is null then
    raise exception 'A session id is required.' using errcode = '22004';
  end if;

  insert into public.prayer_sessions
    (id, prayer_id, user_id, started_at, ended_at, credited_seconds,
     check_ins_shown, check_ins_confirmed)
  values
    (complete_session.id, complete_session.prayer_id, v_uid,
     complete_session.started_at, complete_session.ended_at,
     complete_session.credited_seconds,
     coalesce(complete_session.check_ins_shown, 0),
     coalesce(complete_session.check_ins_confirmed, 0))
  on conflict on constraint prayer_sessions_pkey do nothing;

  -- A retry finds the caller's own row. Anything else means the id belongs to someone else.
  if not exists (
    select 1 from public.prayer_sessions s
    where s.id = complete_session.id and s.user_id = v_uid
  ) then
    raise exception 'This session could not be saved.' using errcode = '42501';
  end if;

  if complete_session.note_body is not null
     and btrim(complete_session.note_body) <> '' then
    if complete_session.note_id is null then
      raise exception 'A note id is required when a note is included.' using errcode = '22004';
    end if;
    insert into public.entries (id, prayer_id, author_id, kind, visibility, body, session_id)
    values
      (complete_session.note_id, complete_session.prayer_id, v_uid, 'note',
       coalesce(complete_session.note_visibility, 'personal'),
       complete_session.note_body, complete_session.id)
    on conflict on constraint entries_pkey do nothing;
  end if;

  return complete_session.id;
end;
$$;

-- 5. get_prayer_hours: totals only, and only for prayers the caller belongs to
create function public.get_prayer_hours(prayer_ids uuid[])
returns table (prayer_id uuid, my_seconds bigint, group_seconds bigint)
language sql stable security definer set search_path = '' as $$
  select
    m.prayer_id,
    coalesce(sum(s.credited_seconds) filter (where s.user_id = m.user_id), 0)::bigint,
    coalesce(sum(s.credited_seconds), 0)::bigint
  from public.prayer_members m
  left join public.prayer_sessions s on s.prayer_id = m.prayer_id
  where m.user_id = (select auth.uid())
    and m.prayer_id = any (get_prayer_hours.prayer_ids)
  group by m.prayer_id;
$$;

-- 6. get_my_hours
create function public.get_my_hours(since timestamptz)
returns table (since_seconds bigint, all_time_seconds bigint)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(sum(s.credited_seconds) filter (where s.started_at >= get_my_hours.since), 0)::bigint,
    coalesce(sum(s.credited_seconds), 0)::bigint
  from public.prayer_sessions s
  where s.user_id = (select auth.uid());
$$;

-- 7. delete_my_account: takes no arguments, so it can only ever affect the caller
create function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

-- Execute privileges: authenticated gets the app functions, anon gets ping() only
revoke all on function public.ping() from public;
revoke all on function public.generate_invite_code() from public, anon, authenticated;
revoke all on function public.create_or_reset_invite(uuid) from public, anon;
revoke all on function public.join_prayer_by_code(text) from public, anon;
revoke all on function public.complete_session(uuid, uuid, timestamptz, timestamptz, integer, integer, integer, uuid, text, text) from public, anon;
revoke all on function public.get_prayer_hours(uuid[]) from public, anon;
revoke all on function public.get_my_hours(timestamptz) from public, anon;
revoke all on function public.delete_my_account() from public, anon;

grant execute on function public.ping() to anon, authenticated;
grant execute on function public.create_or_reset_invite(uuid) to authenticated;
grant execute on function public.join_prayer_by_code(text) to authenticated;
grant execute on function public.complete_session(uuid, uuid, timestamptz, timestamptz, integer, integer, integer, uuid, text, text) to authenticated;
grant execute on function public.get_prayer_hours(uuid[]) to authenticated;
grant execute on function public.get_my_hours(timestamptz) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
