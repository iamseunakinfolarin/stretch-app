-- Stretch v1, phase 1 database: discard and cap in complete_session,
-- own sessions always readable, policy helpers out of the public API.

-- 1. Policy helper functions leave the exposed schema.
--    Policies refer to functions by identity, so they keep working after the move.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_prayer_member(uuid)   set schema private;
alter function public.is_prayer_owner(uuid)    set schema private;
alter function public.shares_prayer_with(uuid) set schema private;

-- 2. A person can always read their own stretches, even after leaving the prayer.
alter policy prayer_sessions_select on public.prayer_sessions
  using (user_id = (select auth.uid()));

-- 3. get_my_hours no longer needs elevated rights: RLS now shows exactly the caller's rows.
alter function public.get_my_hours(timestamptz) security invoker;

-- 4. complete_session: discard under one minute, cap at 24 hours.
create or replace function public.complete_session(
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
  -- Anything over 24 hours is credited as exactly 24 hours.
  v_credited integer := least(complete_session.credited_seconds, 86400);
  -- Under one minute is not a stretch: nothing is logged.
  v_keep boolean;
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;
  if complete_session.id is null then
    raise exception 'A session id is required.' using errcode = '22004';
  end if;
  if complete_session.credited_seconds is null then
    raise exception 'credited_seconds is required.' using errcode = '22004';
  end if;

  v_keep := v_credited >= 60;

  if v_keep then
    insert into public.prayer_sessions
      (id, prayer_id, user_id, started_at, ended_at, credited_seconds,
       check_ins_shown, check_ins_confirmed)
    values
      (complete_session.id, complete_session.prayer_id, v_uid,
       complete_session.started_at, complete_session.ended_at, v_credited,
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
  end if;

  -- A note is kept even when the stretch was too short to log; it is just not linked to one.
  if complete_session.note_body is not null
     and btrim(complete_session.note_body) <> '' then
    if complete_session.note_id is null then
      raise exception 'A note id is required when a note is included.' using errcode = '22004';
    end if;
    insert into public.entries (id, prayer_id, author_id, kind, visibility, body, session_id)
    values
      (complete_session.note_id, complete_session.prayer_id, v_uid, 'note',
       coalesce(complete_session.note_visibility, 'personal'),
       complete_session.note_body,
       case when v_keep then complete_session.id end)
    on conflict on constraint entries_pkey do nothing;
  end if;

  -- The session id when a stretch was logged, null when it was discarded.
  return case when v_keep then complete_session.id end;
end;
$$;
