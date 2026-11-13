-- Stretch v1: tables, constraints, indexes, triggers

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 1. profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 40)
);

-- 2. prayers
create table public.prayers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'prayer',
  title text not null,
  details text,
  status text not null default 'active',
  answered_at timestamptz,
  planned_start_date date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayers_kind_valid check (kind in ('prayer', 'altar')),
  constraint prayers_title_length check (char_length(title) between 1 and 120),
  constraint prayers_details_length check (details is null or char_length(details) <= 2000),
  constraint prayers_status_valid check (status in ('planned', 'active', 'archived')),
  constraint prayers_altar_not_planned check (not (kind = 'altar' and status = 'planned')),
  constraint prayers_answered_requires_archived check (answered_at is null or status = 'archived')
);

-- 3. prayer_members
create table public.prayer_members (
  prayer_id uuid not null references public.prayers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (prayer_id, user_id),
  constraint prayer_members_role_valid check (role in ('owner', 'member'))
);

-- 4. prayer_invites
create table public.prayer_invites (
  prayer_id uuid primary key references public.prayers (id) on delete cascade,
  code text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_invites_code_key unique (code),
  constraint prayer_invites_code_format check (code ~ '^[A-HJ-NP-Z2-9]{8}$')
);

-- 5. prayer_points
create table public.prayer_points (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references public.prayers (id) on delete cascade,
  body text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_points_body_length check (char_length(body) between 1 and 300)
);

-- 6. scriptures
create table public.scriptures (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references public.prayers (id) on delete cascade,
  reference text not null,
  verse_text text,
  translation text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scriptures_reference_length check (char_length(reference) between 1 and 60),
  constraint scriptures_verse_text_length check (verse_text is null or char_length(verse_text) <= 1000),
  constraint scriptures_translation_length check (translation is null or char_length(translation) <= 20)
);

-- 7. prayer_sessions (the stretches). The phone supplies id so retries are idempotent.
create table public.prayer_sessions (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references public.prayers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  credited_seconds integer not null,
  check_ins_shown integer not null default 0,
  check_ins_confirmed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_sessions_ends_after_start check (ended_at > started_at),
  constraint prayer_sessions_credited_range check (credited_seconds between 60 and 86400),
  constraint prayer_sessions_credited_within_elapsed
    check (credited_seconds <= extract(epoch from (ended_at - started_at))),
  constraint prayer_sessions_check_ins_valid
    check (check_ins_shown >= 0 and check_ins_confirmed >= 0
           and check_ins_confirmed <= check_ins_shown)
);

-- 8. entries
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references public.prayers (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  visibility text not null default 'personal',
  body text not null,
  session_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entries_kind_valid check (kind in ('note', 'testimony')),
  constraint entries_visibility_valid check (visibility in ('personal', 'shared')),
  constraint entries_body_length check (char_length(body) between 1 and 5000)
);

-- Indexes named in the brief
create index prayer_members_user_id_idx on public.prayer_members (user_id);
create index prayer_sessions_prayer_id_idx on public.prayer_sessions (prayer_id);
create index prayer_sessions_user_started_idx on public.prayer_sessions (user_id, started_at);
create index entries_prayer_created_idx on public.entries (prayer_id, created_at desc);
create index prayer_points_prayer_position_idx on public.prayer_points (prayer_id, position);
create index scriptures_prayer_position_idx on public.scriptures (prayer_id, position);
-- Extra: cover the remaining foreign keys, and allow exactly one owner row per prayer
create index prayers_owner_id_idx on public.prayers (owner_id);
create index entries_author_id_idx on public.entries (author_id);
create index prayer_invites_created_by_idx on public.prayer_invites (created_by);
create unique index prayer_members_one_owner_idx on public.prayer_members (prayer_id) where role = 'owner';

-- updated_at triggers
create trigger set_updated_at before update on public.profiles        for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.prayers         for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.prayer_members  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.prayer_invites  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.prayer_points   for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.scriptures      for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.prayer_sessions for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.entries         for each row execute function public.set_updated_at();

-- A profile row for every new auth user
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The owner's membership row for every new prayer
create function public.add_owner_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.prayer_members (prayer_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_prayer_created
  after insert on public.prayers
  for each row execute function public.add_owner_membership();

-- Trigger functions are never called through the API
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.add_owner_membership() from public, anon, authenticated;
