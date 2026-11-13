-- 5g. complete_session called twice with the same ids stores one session and one note;
--     credited_seconds under 60, or more than the elapsed time, is rejected.
select tests.act_as('member');
select tests.remember('call', $$select public.complete_session(
  tests.id('new_session'), tests.id('prayer'),
  now() - interval '30 minutes', now() - interval '20 minutes', 300, 2, 1,
  tests.id('new_note'), 'Peace came while praying', 'shared')$$);
select tests.expect_value(tests.recall('call'), tests.id('new_session')::text, 'first call saves the stretch');
select tests.expect_value(tests.recall('call'), tests.id('new_session')::text, 'second call with the same ids succeeds');
select tests.expect_count($$select 1 from public.prayer_sessions where id = tests.id('new_session')$$, 1, 'one session stored');
select tests.expect_count($$select 1 from public.entries where id = tests.id('new_note') and session_id = tests.id('new_session') and kind = 'note' and visibility = 'shared'$$, 1, 'one note stored, linked to the stretch');
select tests.expect_value($$select my_seconds from public.get_prayer_hours(array[tests.id('prayer')])$$, '1200', 'hours counted once (900 + 300)');

select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 59)$$, '23514', 'under 60 seconds is rejected');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 601)$$, '23514', 'more than the elapsed time is rejected');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '2 days', now(), 86401)$$, '23514', 'more than 24 hours is rejected');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now(), now() - interval '10 minutes', 60)$$, '23514', 'ending before starting is rejected');
select tests.expect_value($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 600) is not null$$, 'true', 'exactly the elapsed time is accepted');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 300, 0, 0, null, 'A note with no id')$$, '22004', 'a note needs an id so retries stay idempotent');
select tests.expect_error($$select public.complete_session(tests.id('owner_session'), tests.id('prayer'), now() - interval '10 minutes', now(), 300)$$, '42501', 'another person''s session id cannot be reused');

-- It runs with the caller's permissions: an outsider can't log time on the prayer.
select tests.act_as('outsider');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 300)$$, '42501', 'outsider cannot log a stretch on the prayer');
select tests.act_as_anon();
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 300)$$, '42501', 'signed-out visitor cannot log a stretch');

-- What is really stored: the two fixtures, the idempotent one, and the exact-elapsed one.
select tests.reset();
select tests.expect_count($$select 1 from public.prayer_sessions where prayer_id = tests.id('prayer')$$, 4, 'no rejected call left a session behind');
select tests.expect_count($$select 1 from public.entries where prayer_id = tests.id('prayer')$$, 4, 'no rejected call left a note behind');
