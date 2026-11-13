-- 5b. A member can read the prayer, its points, scriptures, shared entries and member list,
--     but can't change the prayer, points or scriptures.
select tests.act_as('member');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('prayer')$$, 1, 'member reads the prayer');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('prayer')$$, 2, 'member reads both prayer points');
select tests.expect_count($$select 1 from public.scriptures where prayer_id = tests.id('prayer')$$, 1, 'member reads the scripture');
select tests.expect_count($$select 1 from public.entries where id = tests.id('owner_shared')$$, 1, 'member reads the owner''s shared entry');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('prayer')$$, 2, 'member reads the member list');
select tests.expect_count($$select 1 from public.profiles where id = tests.uid('owner')$$, 1, 'member reads the owner''s profile');

select tests.expect_affected($$update public.prayers set title = 'Hijacked' where id = tests.id('prayer')$$, 0, 'member cannot update the prayer');
select tests.expect_affected($$delete from public.prayers where id = tests.id('prayer')$$, 0, 'member cannot delete the prayer');
select tests.expect_affected($$update public.prayer_points set body = 'Hijacked' where prayer_id = tests.id('prayer')$$, 0, 'member cannot update prayer points');
select tests.expect_affected($$delete from public.prayer_points where prayer_id = tests.id('prayer')$$, 0, 'member cannot delete prayer points');
select tests.expect_error($$insert into public.prayer_points (prayer_id, body, position) values (tests.id('prayer'), 'Extra', 2)$$, '42501', 'member cannot add a prayer point');
select tests.expect_affected($$update public.scriptures set reference = 'Hijacked' where prayer_id = tests.id('prayer')$$, 0, 'member cannot update scriptures');
select tests.expect_affected($$delete from public.scriptures where prayer_id = tests.id('prayer')$$, 0, 'member cannot delete scriptures');
select tests.expect_error($$insert into public.scriptures (prayer_id, reference, position) values (tests.id('prayer'), 'John 3:16', 1)$$, '42501', 'member cannot add a scripture');
select tests.expect_affected($$update public.profiles set display_name = 'Hijacked' where id = tests.uid('owner')$$, 0, 'member cannot update the owner''s profile');

-- What is really stored is unchanged.
select tests.reset();
select tests.expect_value($$select title from public.prayers where id = tests.id('prayer')$$, 'For my family', 'prayer title is unchanged');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('prayer') and body <> 'Hijacked'$$, 2, 'prayer points are unchanged');
select tests.expect_count($$select 1 from public.scriptures where prayer_id = tests.id('prayer') and reference = 'Isaiah 41:10'$$, 1, 'scripture is unchanged');

-- Not vacuous: the owner can make the same changes.
select tests.act_as('owner');
select tests.expect_affected($$update public.prayers set title = 'For my whole family' where id = tests.id('prayer')$$, 1, 'owner can update the prayer');
select tests.expect_affected($$insert into public.prayer_points (prayer_id, body, position) values (tests.id('prayer'), 'Extra', 2)$$, 1, 'owner can add a prayer point');
select tests.expect_affected($$update public.scriptures set translation = 'NKJV' where prayer_id = tests.id('prayer')$$, 1, 'owner can update a scripture');
select tests.reset();
