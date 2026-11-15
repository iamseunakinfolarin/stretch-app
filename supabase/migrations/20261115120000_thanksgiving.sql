-- Thanksgiving: a place to record every answer to prayer. Nothing is too small.
-- Two new tables. Each person keeps their own categories; each thanksgiving can be linked to a prayer
-- and shared with the people in that prayer. The older entries table is left as it is.

create table public.thanksgiving_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  glow text not null default 'gold',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint thanksgiving_categories_name_length check (char_length(btrim(name)) between 1 and 40),
  constraint thanksgiving_categories_glow_valid check (glow in ('gold', 'rose', 'green', 'blue', 'violet', 'amber'))
);

-- One category name per person, ignoring capitals and spaces at the ends.
create unique index thanksgiving_categories_owner_name_idx
  on public.thanksgiving_categories (owner_id, lower(btrim(name)));

create table public.thanksgivings (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- Deleting a prayer or a category keeps the thanksgiving, just unlinked.
  prayer_id uuid references public.prayers (id) on delete set null,
  category_id uuid references public.thanksgiving_categories (id) on delete set null,
  title text not null,
  body text not null,
  happened_on date not null default current_date,
  visibility text not null default 'personal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint thanksgivings_title_length check (char_length(btrim(title)) between 1 and 80),
  constraint thanksgivings_body_length check (char_length(btrim(body)) between 1 and 5000),
  constraint thanksgivings_visibility_valid check (visibility in ('personal', 'shared'))
);

create index thanksgivings_author_day_idx on public.thanksgivings (author_id, happened_on desc, created_at desc);
create index thanksgivings_category_id_idx on public.thanksgivings (category_id);
create index thanksgivings_prayer_id_idx on public.thanksgivings (prayer_id);

create trigger set_updated_at before update on public.thanksgiving_categories for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.thanksgivings for each row execute function public.set_updated_at();

alter table public.thanksgiving_categories enable row level security;
alter table public.thanksgivings enable row level security;
-- New tables are open to signed-out visitors by default here; close that.
revoke all on public.thanksgiving_categories, public.thanksgivings from anon;
grant select, insert, update, delete on public.thanksgiving_categories to authenticated;
grant select, insert, update, delete on public.thanksgivings to authenticated;

-- Categories are private to their owner.
create policy thanksgiving_categories_select on public.thanksgiving_categories for select to authenticated
  using (owner_id = (select auth.uid()));
create policy thanksgiving_categories_insert on public.thanksgiving_categories for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy thanksgiving_categories_update on public.thanksgiving_categories for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy thanksgiving_categories_delete on public.thanksgiving_categories for delete to authenticated
  using (owner_id = (select auth.uid()));

-- A thanksgiving is its author's. One that is shared is also readable by the people in its linked prayer.
create policy thanksgivings_select on public.thanksgivings for select to authenticated
  using (
    author_id = (select auth.uid())
    or (visibility = 'shared' and prayer_id is not null and private.is_prayer_member(prayer_id))
  );
-- It may only be linked to a prayer its author belongs to, and filed in a category its author owns.
create policy thanksgivings_insert on public.thanksgivings for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (prayer_id is null or private.is_prayer_member(prayer_id))
    and (category_id is null or exists (
      select 1 from public.thanksgiving_categories c
      where c.id = category_id and c.owner_id = (select auth.uid())))
  );
create policy thanksgivings_update on public.thanksgivings for update to authenticated
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and (prayer_id is null or private.is_prayer_member(prayer_id))
    and (category_id is null or exists (
      select 1 from public.thanksgiving_categories c
      where c.id = category_id and c.owner_id = (select auth.uid())))
  );
create policy thanksgivings_delete on public.thanksgivings for delete to authenticated
  using (author_id = (select auth.uid()));
