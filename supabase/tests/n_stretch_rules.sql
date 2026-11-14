-- The rules for saving a stretch are enforced by the database itself, not by the app:
-- under one minute is never stored, even by a direct insert; only the owner or a member of
-- the prayer can save one; and there is no maximum length.

-- The owner counts as a member, so the owner can save a stretch on their own prayer.
select tests.act_as('owner');
select tests.expect_value($$select public.complete_session('20000000-0000-4000-a000-0000000000f1', tests.id('prayer'), now() - interval '10 minutes', now(), 120) is not null$$, 'true', 'the owner can save a stretch');

-- Under one minute: rejected by the table itself, bypassing the function.
select tests.expect_error($$insert into public.prayer_sessions (prayer_id, user_id, started_at, ended_at, credited_seconds) values (tests.id('prayer'), tests.uid('owner'), now() - interval '10 minutes', now(), 59)$$, '23514', 'a direct insert of 59 seconds is rejected');
select tests.expect_error($$insert into public.prayer_sessions (prayer_id, user_id, started_at, ended_at, credited_seconds) values (tests.id('prayer'), tests.uid('owner'), now() - interval '10 minutes', now(), 0)$$, '23514', 'a direct insert of 0 seconds is rejected');
select tests.expect_error($$insert into public.prayer_sessions (prayer_id, user_id, started_at, ended_at, credited_seconds) values (tests.id('prayer'), tests.uid('owner'), now() - interval '10 minutes', now(), -1)$$, '23514', 'a direct insert of a negative value is rejected');
select tests.expect_value($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 59) is null$$, 'true', 'the function discards 59 seconds without storing it');

-- A direct insert of one minute or more by a member is allowed, and has no upper limit.
select tests.act_as('member');
select tests.expect_affected($$insert into public.prayer_sessions (prayer_id, user_id, started_at, ended_at, credited_seconds) values (tests.id('prayer'), tests.uid('member'), now() - interval '200 hours', now(), 720000)$$, 1, 'a member can store 200 hours in one stretch');

-- Someone who does not belong to the prayer cannot save a stretch on it, by either route.
select tests.act_as('outsider');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 300)$$, '42501', 'an outsider cannot save a stretch through the function');
select tests.expect_error($$insert into public.prayer_sessions (prayer_id, user_id, started_at, ended_at, credited_seconds) values (tests.id('prayer'), tests.uid('outsider'), now() - interval '10 minutes', now(), 300)$$, '42501', 'an outsider cannot insert one directly');
select tests.expect_error($$insert into public.prayer_sessions (prayer_id, user_id, started_at, ended_at, credited_seconds) values (tests.id('prayer'), tests.uid('member'), now() - interval '10 minutes', now(), 300)$$, '42501', 'nobody can save a stretch in someone else''s name');

-- A signed-out visitor cannot save one either.
select tests.act_as_anon();
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 300)$$, '42501', 'a signed-out visitor cannot save a stretch');
