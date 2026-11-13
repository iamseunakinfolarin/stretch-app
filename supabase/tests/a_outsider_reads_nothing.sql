-- 5a. An outsider can't read any prayer, point, scripture, member row, invite, session or entry
--     of a prayer they don't belong to.
select tests.act_as('outsider');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('prayer')$$, 0, 'outsider cannot read the prayer');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('prayer')$$, 0, 'outsider cannot read prayer points');
select tests.expect_count($$select 1 from public.scriptures where prayer_id = tests.id('prayer')$$, 0, 'outsider cannot read scriptures');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('prayer')$$, 0, 'outsider cannot read member rows');
select tests.expect_count($$select 1 from public.prayer_invites where prayer_id = tests.id('prayer')$$, 0, 'outsider cannot read the invite');
select tests.expect_count($$select 1 from public.prayer_sessions where prayer_id = tests.id('prayer')$$, 0, 'outsider cannot read sessions');
select tests.expect_count($$select 1 from public.entries where prayer_id = tests.id('prayer')$$, 0, 'outsider cannot read entries, shared or personal');
select tests.expect_count($$select 1 from public.profiles where id in (tests.uid('owner'), tests.uid('member'))$$, 0, 'outsider cannot read the profiles of people they share no prayer with');
select tests.expect_count($$select * from public.get_prayer_hours(array[tests.id('prayer')])$$, 0, 'outsider gets no hours for the prayer');

-- The outsider can't write into it either.
select tests.expect_error($$insert into public.entries (prayer_id, author_id, kind, body) values (tests.id('prayer'), tests.uid('outsider'), 'note', 'x')$$, '42501', 'outsider cannot add an entry');
select tests.expect_error($$insert into public.prayer_points (prayer_id, body, position) values (tests.id('prayer'), 'x', 9)$$, '42501', 'outsider cannot add a prayer point');
select tests.expect_error($$insert into public.prayer_members (prayer_id, user_id, role) values (tests.id('prayer'), tests.uid('outsider'), 'member')$$, '42501', 'outsider cannot add themselves as a member directly');

-- Not vacuous: the same user does see their own data.
select tests.expect_count($$select 1 from public.prayers$$, 1, 'outsider sees exactly their own prayer');
select tests.expect_count($$select 1 from public.profiles$$, 1, 'outsider sees exactly their own profile');

-- Signed-out visitors have no table access at all.
select tests.act_as_anon();
select tests.expect_error($$select 1 from public.prayers$$, '42501', 'signed-out visitor cannot query prayers');
select tests.expect_error($$select 1 from public.entries$$, '42501', 'signed-out visitor cannot query entries');
select tests.expect_error($$select 1 from public.profiles$$, '42501', 'signed-out visitor cannot query profiles');
select tests.reset();
