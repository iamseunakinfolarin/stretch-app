-- complete_session: calling it twice with the same ids stores one session and one note;
-- a stretch under one minute is discarded; credited time is capped at 24 hours;
-- credited time above the elapsed time is rejected.
select tests.act_as('member');

-- Idempotent: the phone can safely retry.
select tests.remember('call', $$select public.complete_session(
  tests.id('new_session'), tests.id('prayer'),
  now() - interval '30 minutes', now() - interval '20 minutes', 300, 2, 1,
  tests.id('new_note'), 'Peace came while praying', 'shared')$$);
select tests.expect_value(tests.recall('call'), tests.id('new_session')::text, 'first call saves the stretch and returns its id');
select tests.expect_value(tests.recall('call'), tests.id('new_session')::text, 'second call with the same ids succeeds');
select tests.expect_count($$select 1 from public.prayer_sessions where id = tests.id('new_session')$$, 1, 'one session stored');
select tests.expect_count($$select 1 from public.entries where id = tests.id('new_note') and session_id = tests.id('new_session') and kind = 'note' and visibility = 'shared'$$, 1, 'one note stored, linked to the stretch');
select tests.expect_value($$select my_seconds from public.get_prayer_hours(array[tests.id('prayer')])$$, '1200', 'hours counted once (900 + 300)');

-- Under one minute: discarded quietly. No error, no session, the function returns null.
select tests.expect_value($$select public.complete_session('20000000-0000-4000-a000-0000000000d1', tests.id('prayer'), now() - interval '10 minutes', now(), 59) is null$$, 'true', '59 seconds returns null');
select tests.expect_count($$select 1 from public.prayer_sessions where id = '20000000-0000-4000-a000-0000000000d1'$$, 0, '59 seconds stores no session');
select tests.expect_value($$select public.complete_session('20000000-0000-4000-a000-0000000000d2', tests.id('prayer'), now() - interval '10 minutes', now(), 0) is null$$, 'true', '0 seconds returns null');
select tests.expect_value($$select public.complete_session('20000000-0000-4000-a000-0000000000d3', tests.id('prayer'), now() - interval '10 minutes', now(), -5) is null$$, 'true', 'a negative value returns null');
select tests.expect_value($$select my_seconds from public.get_prayer_hours(array[tests.id('prayer')])$$, '1200', 'discarded stretches add no hours');

-- A note written during a discarded stretch is kept, without a link to a stretch.
select tests.remember('short_call', $$select public.complete_session(
  '20000000-0000-4000-a000-0000000000d4', tests.id('prayer'),
  now() - interval '10 minutes', now(), 30, 0, 0,
  '30000000-0000-4000-a000-0000000000d4', 'Short, but I heard something', 'personal')$$);
select tests.expect_value(tests.recall('short_call') || ' is null', 'true', 'a short stretch with a note returns null');
select tests.expect_value(tests.recall('short_call') || ' is null', 'true', 'and can be retried');
select tests.expect_count($$select 1 from public.prayer_sessions where id = '20000000-0000-4000-a000-0000000000d4'$$, 0, 'the short stretch is not stored');
select tests.expect_count($$select 1 from public.entries where id = '30000000-0000-4000-a000-0000000000d4' and session_id is null and body = 'Short, but I heard something'$$, 1, 'its note is stored once, not linked to a stretch');

-- Exactly one minute is a stretch.
select tests.expect_value($$select public.complete_session('20000000-0000-4000-a000-0000000000e1', tests.id('prayer'), now() - interval '10 minutes', now(), 60)$$, '20000000-0000-4000-a000-0000000000e1', 'exactly 60 seconds is saved');

-- Over 24 hours: saved as exactly 24 hours.
select tests.expect_value($$select public.complete_session('20000000-0000-4000-a000-0000000000c1', tests.id('prayer'), now() - interval '30 hours', now(), 90000)$$, '20000000-0000-4000-a000-0000000000c1', '25 hours of credit is accepted');
select tests.expect_value($$select credited_seconds from public.prayer_sessions where id = '20000000-0000-4000-a000-0000000000c1'$$, '86400', 'and stored as exactly 24 hours');
select tests.expect_value($$select public.complete_session('20000000-0000-4000-a000-0000000000c2', tests.id('prayer'), now() - interval '24 hours', now(), 86400)$$, '20000000-0000-4000-a000-0000000000c2', 'exactly 24 hours is saved as it is');
select tests.expect_value($$select credited_seconds from public.prayer_sessions where id = '20000000-0000-4000-a000-0000000000c2'$$, '86400', 'exactly 24 hours is stored unchanged');

-- More credit than the clock allows is a broken request, and is refused.
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 601)$$, '23514', 'more than the elapsed time is rejected');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '2 hours', now(), 90000)$$, '23514', 'a capped value still cannot exceed the elapsed time');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now(), now() - interval '10 minutes', 60)$$, '23514', 'ending before starting is rejected');
select tests.expect_value($$select public.complete_session('20000000-0000-4000-a000-0000000000e2', tests.id('prayer'), now() - interval '10 minutes', now(), 600)$$, '20000000-0000-4000-a000-0000000000e2', 'exactly the elapsed time is accepted');

-- Bad requests.
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), null)$$, '22004', 'credited_seconds is required');
select tests.expect_error($$select public.complete_session(null, tests.id('prayer'), now() - interval '10 minutes', now(), 300)$$, '22004', 'a session id is required');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 300, 0, 0, null, 'A note with no id')$$, '22004', 'a note needs an id so retries stay idempotent');
select tests.expect_error($$select public.complete_session(tests.id('owner_session'), tests.id('prayer'), now() - interval '10 minutes', now(), 300)$$, '42501', 'another person''s session id cannot be reused');

-- It runs with the caller's permissions: an outsider can't log time or leave notes on the prayer.
select tests.act_as('outsider');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 300)$$, '42501', 'outsider cannot log a stretch on the prayer');
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 30, 0, 0, gen_random_uuid(), 'Sneaky note')$$, '42501', 'outsider cannot leave a note through a short stretch');
select tests.expect_value($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 30) is null$$, 'true', 'an outsider''s short stretch does nothing at all');
select tests.act_as_anon();
select tests.expect_error($$select public.complete_session(gen_random_uuid(), tests.id('prayer'), now() - interval '10 minutes', now(), 300)$$, '42501', 'signed-out visitor cannot log a stretch');

-- What is really stored: 2 from the fixtures, then new_session, e1, c1, c2 and e2.
select tests.reset();
select tests.expect_count($$select 1 from public.prayer_sessions where prayer_id = tests.id('prayer')$$, 7, 'no discarded or rejected call left a session behind');
select tests.expect_count($$select 1 from public.prayer_sessions where credited_seconds < 60 or credited_seconds > 86400$$, 0, 'every stored stretch is between one minute and 24 hours');
select tests.expect_count($$select 1 from public.entries where prayer_id = tests.id('prayer')$$, 5, 'only the two real notes were added');
