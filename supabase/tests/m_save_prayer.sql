-- save_prayer: one call saves a prayer with its points and scriptures, all or nothing.
-- It runs with the caller's permissions, so only the owner can use it on a prayer.
select tests.act_as('outsider');

select tests.remember('create', $$select public.save_prayer(
  tests.id('new_prayer'), 'altar', '  Morning watch  ', 100, null, null,
  '[{"id":"40000000-0000-4000-a000-0000000000a1","body":"Thank God for today"},
    {"id":"40000000-0000-4000-a000-0000000000a2","body":"  Pray for the family  "}]',
  '[{"id":"50000000-0000-4000-a000-0000000000b1","reference":"Psalm 5:3","verse_text":"My voice shalt thou hear in the morning, O LORD","translation":"KJV"},
    {"id":"50000000-0000-4000-a000-0000000000b2","reference":"Mark 1:35","verse_text":"  ","translation":""}]')$$);
select tests.expect_value(tests.recall('create'), tests.id('new_prayer')::text, 'one call creates the altar and returns its id');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer') and kind = 'altar' and status = 'active' and title = 'Morning watch' and target_hours = 100 and owner_id = tests.uid('outsider')$$, 1, 'the altar is stored, with its title trimmed and its plan');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('new_prayer') and user_id = tests.uid('outsider') and role = 'owner'$$, 1, 'the owner membership was created');
select tests.expect_value($$select string_agg(body, ' | ' order by position) from public.prayer_points where prayer_id = tests.id('new_prayer')$$, 'Thank God for today | Pray for the family', 'both points are stored in order, trimmed');
select tests.expect_value($$select string_agg(reference, ' | ' order by position) from public.scriptures where prayer_id = tests.id('new_prayer')$$, 'Psalm 5:3 | Mark 1:35', 'both scriptures are stored in order');
select tests.expect_count($$select 1 from public.scriptures where id = '50000000-0000-4000-a000-0000000000b2' and verse_text is null and translation is null$$, 1, 'blank verse text and translation are stored as empty');

-- A retry after a dropped connection changes nothing.
select tests.expect_value(tests.recall('create'), tests.id('new_prayer')::text, 'the same call again succeeds');
select tests.expect_count($$select 1 from public.prayers where owner_id = tests.uid('outsider')$$, 2, 'no second prayer was created (the fixture one plus this one)');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('new_prayer')$$, 2, 'no points were duplicated');
select tests.expect_count($$select 1 from public.scriptures where prayer_id = tests.id('new_prayer')$$, 2, 'no scriptures were duplicated');

-- Edit: rename, set a different plan, reorder the points, add one, edit one. The type cannot change.
select tests.expect_value($$select public.save_prayer(
  tests.id('new_prayer'), 'prayer', 'The morning watch', 250, null, null,
  '[{"id":"40000000-0000-4000-a000-0000000000a2","body":"Pray for the whole family"},
    {"id":"40000000-0000-4000-a000-0000000000a1","body":"Thank God for today"},
    {"id":"40000000-0000-4000-a000-0000000000a3","body":"Listen"}]',
  '[{"id":"50000000-0000-4000-a000-0000000000b1","reference":"Psalm 5:3","verse_text":"My voice shalt thou hear in the morning, O LORD","translation":"KJV"},
    {"id":"50000000-0000-4000-a000-0000000000b2","reference":"Mark 1:35","verse_text":"And in the morning, rising up a great while before day","translation":"KJV"}]')$$, tests.id('new_prayer')::text, 'an edit saves');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer') and title = 'The morning watch' and target_hours = 250 and kind = 'altar'$$, 1, 'title and plan changed; the type stayed an altar');
select tests.expect_value($$select string_agg(body, ' | ' order by position) from public.prayer_points where prayer_id = tests.id('new_prayer')$$, 'Pray for the whole family | Thank God for today | Listen', 'points are reordered, edited and added');
select tests.expect_value($$select string_agg(position::text, ',' order by position) from public.prayer_points where prayer_id = tests.id('new_prayer')$$, '0,1,2', 'positions run 0, 1, 2');
select tests.expect_count($$select 1 from public.scriptures where id = '50000000-0000-4000-a000-0000000000b2' and verse_text like 'And in the morning%' and translation = 'KJV'$$, 1, 'a scripture was edited in place');

-- Removing items deletes them.
select tests.expect_value($$select public.save_prayer(
  tests.id('new_prayer'), 'altar', 'The morning watch', null, null, null,
  '[{"id":"40000000-0000-4000-a000-0000000000a3","body":"Listen"}]', '[]')$$, tests.id('new_prayer')::text, 'an edit that removes items saves');
select tests.expect_value($$select string_agg(body, ' | ' order by position) from public.prayer_points where prayer_id = tests.id('new_prayer')$$, 'Listen', 'the removed points are gone and the one left moved to the top');
select tests.expect_count($$select 1 from public.scriptures where prayer_id = tests.id('new_prayer')$$, 0, 'all scriptures were removed');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer') and target_hours is null$$, 1, 'the plan was cleared');

-- Limits and bad input are refused, and a refused save changes nothing at all.
select tests.expect_error(format($$select public.save_prayer(tests.id('new_prayer'), 'altar', 'Too many', null, null, null, %L, '[]')$$,
  (select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'body', 'Point ' || n)) from generate_series(1, 21) n)), '22023', '21 prayer points are refused');
select tests.expect_error(format($$select public.save_prayer(tests.id('new_prayer'), 'altar', 'Too many', null, null, null, '[]', %L)$$,
  (select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'reference', 'Psalm ' || n)) from generate_series(1, 11) n)), '22023', '11 scriptures are refused');
select tests.expect_value(format($$select public.save_prayer('10000000-0000-4000-a000-0000000000f1', 'prayer', 'Right at the limits', null, null, null, %L, %L)$$,
  (select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'body', 'Point ' || n)) from generate_series(1, 20) n),
  (select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'reference', 'Psalm ' || n)) from generate_series(1, 10) n)), '10000000-0000-4000-a000-0000000000f1', '20 points and 10 scriptures are accepted');
select tests.expect_error($$select public.save_prayer(tests.id('new_prayer'), 'altar', 'Bad shape', null, null, null, '{"id":"x"}', '[]')$$, '22023', 'points that are not a list are refused');
select tests.expect_error($$select public.save_prayer(null, 'prayer', 'No id', null, null, null, '[]', '[]')$$, '22004', 'a prayer id is required');
select tests.expect_error($$select public.save_prayer(tests.id('new_prayer'), 'altar', '   ', null, null, null, '[]', '[]')$$, '23514', 'a blank title is refused');
select tests.expect_error($$select public.save_prayer(gen_random_uuid(), 'vigil', 'Unknown type', null, null, null, '[]', '[]')$$, '23514', 'an unknown type is refused');
select tests.expect_error($$select public.save_prayer(tests.id('new_prayer'), 'altar', 'Bad plan', 0, null, null, '[]', '[]')$$, '23514', 'a target of 0 hours is refused');
select tests.expect_error($$select public.save_prayer(tests.id('new_prayer'), 'altar', 'Bad plan', null, '2026-12-31', '2026-12-01', '[]', '[]')$$, '23514', 'an end date before the start date is refused');
select tests.expect_error($$select public.save_prayer(tests.id('new_prayer'), 'altar', 'A changed title', 5, null, null,
  '[{"id":"40000000-0000-4000-a000-0000000000a3","body":"Listen closely"},{"id":"40000000-0000-4000-a000-0000000000a4","body":""}]', '[]')$$, '23514', 'an empty prayer point is refused');
select tests.expect_error(format($$select public.save_prayer(tests.id('new_prayer'), 'altar', 'A changed title', 5, null, null, %L, '[]')$$,
  jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'body', repeat('x', 301)))), '23514', 'a 301 character prayer point is refused');
select tests.expect_error($$select public.save_prayer(tests.id('new_prayer'), 'altar', 'A changed title', 5, null, null, '[]',
  '[{"id":"50000000-0000-4000-a000-0000000000b9","verse_text":"No reference"}]')$$, '23502', 'a scripture without a reference is refused');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer') and title = 'The morning watch' and target_hours is null$$, 1, 'after all those refusals the prayer is exactly as it was');
select tests.expect_value($$select string_agg(body, ' | ' order by position) from public.prayer_points where prayer_id = tests.id('new_prayer')$$, 'Listen', 'and so are its points: a refused save is all or nothing');

-- Only the owner can save a prayer.
select tests.reset();
select tests.remember('owner_point', (select id::text from public.prayer_points where prayer_id = tests.id('prayer') and position = 0));
select tests.act_as('member');
select tests.expect_error($$select public.save_prayer(tests.id('prayer'), 'prayer', 'Taken over', null, null, null, '[]', '[]')$$, '42501', 'a member cannot save the owner''s prayer');
select tests.act_as('outsider');
select tests.expect_error($$select public.save_prayer(tests.id('prayer'), 'prayer', 'Taken over', null, null, null, '[]', '[]')$$, '42501', 'an outsider cannot save someone else''s prayer');
select tests.expect_error(format($$select public.save_prayer(tests.id('new_prayer'), 'altar', 'The morning watch', null, null, null, %L, '[]')$$,
  jsonb_build_array(jsonb_build_object('id', tests.recall('owner_point'), 'body', 'Stolen point'))), '42501', 'a point id from someone else''s prayer cannot be taken over');
select tests.expect_error($$select public.save_prayer(tests.id('new_prayer'), 'altar', 'The morning watch', null, null, null, '[]',
  '[{"id":"50000000-0000-4000-a000-0000000000c1","reference":"Psalm 1:1"},{"id":"50000000-0000-4000-a000-0000000000c1","reference":"Psalm 1:2"}]')$$, '21000', 'the same id listed twice is refused');
select tests.expect_value($$select string_agg(body, ' | ' order by position) from public.prayer_points where prayer_id = tests.id('new_prayer')$$, 'Listen', 'the refused takeover left the caller''s own points as they were');
select tests.act_as_anon();
select tests.expect_error($$select public.save_prayer(gen_random_uuid(), 'prayer', 'Anonymous', null, null, null, '[]', '[]')$$, '42501', 'a signed-out visitor cannot save a prayer');

select tests.reset();
select tests.expect_value($$select title from public.prayers where id = tests.id('prayer')$$, 'For my family', 'the owner''s prayer is untouched');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('prayer')$$, 2, 'the owner''s points are untouched');
select tests.expect_count(format($$select 1 from public.prayer_points where id = %L and prayer_id = tests.id('prayer') and body = 'Peace in our home'$$, tests.recall('owner_point')), 1, 'the targeted point still belongs to the owner, unchanged');
