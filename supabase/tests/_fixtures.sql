-- Fixtures: three users and one shared prayer. Everything is created through the same
-- doors the app uses (RLS and the database functions), then rolled back with the transaction.

insert into auth.users (id, instance_id, aud, role, email) values
  (tests.uid('owner'),    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@tests.stretch.invalid'),
  (tests.uid('member'),   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@tests.stretch.invalid'),
  (tests.uid('outsider'), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@tests.stretch.invalid');

-- Owner: a prayer with two points, one scripture, a personal and a shared entry, one stretch.
select tests.act_as('owner');
insert into public.prayers (id, owner_id, title) values (tests.id('prayer'), tests.uid('owner'), 'For my family');
insert into public.prayer_points (prayer_id, body, position) values
  (tests.id('prayer'), 'Peace in our home', 0),
  (tests.id('prayer'), 'Health for my parents', 1);
insert into public.scriptures (prayer_id, reference, verse_text, translation, position) values
  (tests.id('prayer'), 'Isaiah 41:10', 'Fear thou not; for I am with thee.', 'KJV', 0);
insert into public.entries (id, prayer_id, author_id, kind, visibility, body) values
  (tests.id('owner_personal'), tests.id('prayer'), tests.uid('owner'), 'note', 'personal', 'Owner private note'),
  (tests.id('owner_shared'),   tests.id('prayer'), tests.uid('owner'), 'note', 'shared',   'Owner shared note');
select public.complete_session(tests.id('owner_session'), tests.id('prayer'),
  now() - interval '2 hours', now() - interval '2 hours' + interval '20 minutes', 600);
select tests.remember('code', public.create_or_reset_invite(tests.id('prayer')));

-- Member: joins by code, adds a personal entry and a stretch.
select tests.act_as('member');
select public.join_prayer_by_code(tests.recall('code'));
insert into public.entries (id, prayer_id, author_id, kind, visibility, body) values
  (tests.id('member_personal'), tests.id('prayer'), tests.uid('member'), 'note', 'personal', 'Member private note');
select public.complete_session(tests.id('member_session'), tests.id('prayer'),
  now() - interval '1 hour', now() - interval '1 hour' + interval '20 minutes', 900);

-- Outsider: has their own prayer, and nothing to do with the shared one.
select tests.act_as('outsider');
insert into public.prayers (id, owner_id, title) values (tests.id('outsider_prayer'), tests.uid('outsider'), 'Outsider prayer');

select tests.reset();
