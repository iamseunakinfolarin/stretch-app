-- Stretch v1: helper functions, privileges, row level security

create function public.is_prayer_member(prayer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.prayer_members m
    where m.prayer_id = is_prayer_member.prayer_id
      and m.user_id = (select auth.uid())
  );
$$;

create function public.is_prayer_owner(prayer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.prayers p
    where p.id = is_prayer_owner.prayer_id
      and p.owner_id = (select auth.uid())
  );
$$;

create function public.shares_prayer_with(other_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.prayer_members mine
    join public.prayer_members theirs on theirs.prayer_id = mine.prayer_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = shares_prayer_with.other_user_id
  );
$$;

revoke all on function public.is_prayer_member(uuid) from public, anon;
revoke all on function public.is_prayer_owner(uuid) from public, anon;
revoke all on function public.shares_prayer_with(uuid) from public, anon;
grant execute on function public.is_prayer_member(uuid) to authenticated;
grant execute on function public.is_prayer_owner(uuid) to authenticated;
grant execute on function public.shares_prayer_with(uuid) to authenticated;

-- Table privileges: only what the policies below can use. RLS stays the gate.
revoke all on public.profiles, public.prayers, public.prayer_members, public.prayer_invites,
              public.prayer_points, public.scriptures, public.prayer_sessions, public.entries
  from public, anon, authenticated;

grant select, update                 on public.profiles        to authenticated;
grant select, insert, update, delete on public.prayers         to authenticated;
grant select, delete                 on public.prayer_members  to authenticated;
grant select                         on public.prayer_invites  to authenticated;
grant select, insert, update, delete on public.prayer_points   to authenticated;
grant select, insert, update, delete on public.scriptures      to authenticated;
grant select, insert                 on public.prayer_sessions to authenticated;
grant select, insert, update, delete on public.entries         to authenticated;

alter table public.profiles        enable row level security;
alter table public.prayers         enable row level security;
alter table public.prayer_members  enable row level security;
alter table public.prayer_invites  enable row level security;
alter table public.prayer_points   enable row level security;
alter table public.scriptures      enable row level security;
alter table public.prayer_sessions enable row level security;
alter table public.entries         enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_prayer_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- prayers (owner_id check lets the creator read the row in the same statement)
create policy prayers_select on public.prayers for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_prayer_member(id));
create policy prayers_insert on public.prayers for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy prayers_update on public.prayers for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy prayers_delete on public.prayers for delete to authenticated
  using (owner_id = (select auth.uid()));

-- prayer_members: no insert or update policy, so no direct inserts or role changes
create policy prayer_members_select on public.prayer_members for select to authenticated
  using (public.is_prayer_member(prayer_id));
create policy prayer_members_delete on public.prayer_members for delete to authenticated
  using (
    role = 'member'
    and (user_id = (select auth.uid()) or public.is_prayer_owner(prayer_id))
  );

-- prayer_invites: owner reads; writes only through create_or_reset_invite()
create policy prayer_invites_select on public.prayer_invites for select to authenticated
  using (public.is_prayer_owner(prayer_id));

-- prayer_points
create policy prayer_points_select on public.prayer_points for select to authenticated
  using (public.is_prayer_member(prayer_id));
create policy prayer_points_insert on public.prayer_points for insert to authenticated
  with check (public.is_prayer_owner(prayer_id));
create policy prayer_points_update on public.prayer_points for update to authenticated
  using (public.is_prayer_owner(prayer_id))
  with check (public.is_prayer_owner(prayer_id));
create policy prayer_points_delete on public.prayer_points for delete to authenticated
  using (public.is_prayer_owner(prayer_id));

-- scriptures
create policy scriptures_select on public.scriptures for select to authenticated
  using (public.is_prayer_member(prayer_id));
create policy scriptures_insert on public.scriptures for insert to authenticated
  with check (public.is_prayer_owner(prayer_id));
create policy scriptures_update on public.scriptures for update to authenticated
  using (public.is_prayer_owner(prayer_id))
  with check (public.is_prayer_owner(prayer_id));
create policy scriptures_delete on public.scriptures for delete to authenticated
  using (public.is_prayer_owner(prayer_id));

-- prayer_sessions: own rows only, only for prayers you belong to; no update or delete
create policy prayer_sessions_select on public.prayer_sessions for select to authenticated
  using (user_id = (select auth.uid()) and public.is_prayer_member(prayer_id));
create policy prayer_sessions_insert on public.prayer_sessions for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_prayer_member(prayer_id));

-- entries
create policy entries_select on public.entries for select to authenticated
  using (
    author_id = (select auth.uid())
    or (visibility = 'shared' and public.is_prayer_member(prayer_id))
  );
create policy entries_insert on public.entries for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_prayer_member(prayer_id));
create policy entries_update on public.entries for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and public.is_prayer_member(prayer_id));
create policy entries_delete on public.entries for delete to authenticated
  using (author_id = (select auth.uid()));
