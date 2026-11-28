-- Instructions and rituals: what God says to do, written down on the prayer or altar it was given in.
-- An instruction is done once; a ritual is kept again and again for as long as its prayer or altar lasts.
-- Each belongs to the person who received it. Private by default; it can be shared with the people in the prayer.

create table public.prayer_instructions (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references public.prayers (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'instruction',
  body text not null,
  received_on date not null default current_date,
  -- Instructions only: the day it was done.
  done_on date,
  -- Rituals only: how often, in the person's words ("Daily", "Every Wednesday").
  frequency text,
  visibility text not null default 'personal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_instructions_kind_valid check (kind in ('instruction', 'ritual')),
  constraint prayer_instructions_body_length check (char_length(btrim(body)) between 1 and 500),
  constraint prayer_instructions_frequency_length check (frequency is null or char_length(btrim(frequency)) between 1 and 80),
  constraint prayer_instructions_visibility_valid check (visibility in ('personal', 'shared')),
  constraint prayer_instructions_fields_match_kind check (
    (kind = 'instruction' and frequency is null)
    or (kind = 'ritual' and frequency is not null and done_on is null)
  )
);

create index prayer_instructions_prayer_id_idx on public.prayer_instructions (prayer_id, received_on);
create index prayer_instructions_author_id_idx on public.prayer_instructions (author_id);

create trigger set_updated_at before update on public.prayer_instructions for each row execute function public.set_updated_at();

alter table public.prayer_instructions enable row level security;
revoke all on public.prayer_instructions from anon;
grant select, insert, update, delete on public.prayer_instructions to authenticated;

-- Your own, always; someone else's only when shared and you are in that prayer.
create policy prayer_instructions_select on public.prayer_instructions for select to authenticated
  using (
    author_id = (select auth.uid())
    or (visibility = 'shared' and private.is_prayer_member(prayer_id))
  );
-- You write your own, and only on a prayer you are in.
create policy prayer_instructions_insert on public.prayer_instructions for insert to authenticated
  with check (author_id = (select auth.uid()) and private.is_prayer_member(prayer_id));
create policy prayer_instructions_update on public.prayer_instructions for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and private.is_prayer_member(prayer_id));
create policy prayer_instructions_delete on public.prayer_instructions for delete to authenticated
  using (author_id = (select auth.uid()));
