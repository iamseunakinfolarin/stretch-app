-- Prayer commitment: hours to pray each week.
-- Altars have no target; commitments are within range; save_prayer stores them; and get_my_commitment_status
-- works out the shortfall: weeks start on Sunday, a short week does not carry over, extra hours pay it down,
-- the current week never counts as short, and only the caller's own stretches are counted.

select tests.act_as('owner');

-- Rules on the table.
select tests.expect_error($$select public.save_prayer(gen_random_uuid(), 'altar', 'Morning watch', 100, null, null, '[]', '[]')$$, '23514', 'an altar cannot have a target');
select tests.expect_error($$select public.save_prayer(gen_random_uuid(), 'altar', 'Morning watch', null, null, null, '[]', '[]', 0)$$, '23514', 'a commitment of 0 hours a week is rejected');
select tests.expect_error($$select public.save_prayer(gen_random_uuid(), 'altar', 'Morning watch', null, null, null, '[]', '[]', 169)$$, '23514', 'more hours than a week holds is rejected');

-- save_prayer stores the commitment, and a prayer keeps both its target and its commitment.
select tests.expect_value($$select public.save_prayer(tests.id('new_prayer'), 'prayer', 'For Mum''s recovery', 40, '2026-12-01', '2026-12-31', '[]', '[]', 5)$$, tests.id('new_prayer')::text, 'a prayer saves a target and a weekly commitment');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer') and target_hours = 40 and commitment_hours = 5 and commitment_set_at is not null$$, 1, 'both are stored, and the date the commitment was set');
select tests.expect_value($$select public.save_prayer(tests.id('new_altar'), 'altar', 'Morning watch', null, null, null, '[]', '[]', 2.5)$$, tests.id('new_altar')::text, 'an altar saves a weekly commitment');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_altar') and target_hours is null and commitment_hours = 2.5$$, 1, 'with no target');

-- Saving again without changing the commitment keeps the date; changing it restarts the count of weeks.
select tests.reset();
update public.prayers set commitment_set_at = now() - interval '40 days' where id = tests.id('new_prayer');
select tests.act_as('owner');
select tests.expect_value($$select public.save_prayer(tests.id('new_prayer'), 'prayer', 'For Mum''s recovery', 40, '2026-12-01', '2026-12-31', '[]', '[]', 5)$$, tests.id('new_prayer')::text, 'saved again with the same commitment');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer') and commitment_set_at < now() - interval '39 days'$$, 1, 'the date is kept');
select tests.expect_value($$select public.save_prayer(tests.id('new_prayer'), 'prayer', 'For Mum''s recovery', 40, '2026-12-01', '2026-12-31', '[]', '[]', 6)$$, tests.id('new_prayer')::text, 'saved with a new commitment');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer') and commitment_set_at > now() - interval '1 minute'$$, 1, 'the date restarts');
select tests.expect_value($$select public.save_prayer(tests.id('new_prayer'), 'prayer', 'For Mum''s recovery', 40, '2026-12-01', '2026-12-31', '[]', '[]', null)$$, tests.id('new_prayer')::text, 'saved with no commitment');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer') and commitment_hours is null and commitment_set_at is null$$, 1, 'it is cleared');
select tests.expect_count($$select 1 from public.get_my_commitment_status(tests.id('new_prayer'))$$, 0, 'with no commitment there is nothing to report');

-- Shortfall. A 5 hour commitment that started two full weeks ago (weeks start on Sunday, UTC).
select tests.reset();
create temp table w as select ((date_trunc('week', (now() at time zone 'UTC') + interval '1 day') - interval '1 day') at time zone 'UTC') as start;
grant select on w to authenticated;
update public.prayers set commitment_hours = 5, commitment_set_at = (select start from w) - interval '14 days' + interval '1 hour' where id = tests.id('new_prayer');
update public.prayer_members set joined_at = (select start from w) - interval '20 days' where prayer_id = tests.id('new_prayer');
select tests.act_as('owner');
select tests.expect_value($$select completed_weeks::text from public.get_my_commitment_status(tests.id('new_prayer'))$$, '2', 'two weeks have finished');
select tests.expect_value($$select shortfall_seconds::text from public.get_my_commitment_status(tests.id('new_prayer'))$$, '36000', 'nothing prayed: 10 hours short');

-- 3 hours in each finished week: 4 hours short.
select public.complete_session('50000000-0000-4000-a000-000000000001', tests.id('new_prayer'), (select start from w) - interval '12 days' - interval '3 hours', (select start from w) - interval '12 days', 10800);
select public.complete_session('50000000-0000-4000-a000-000000000002', tests.id('new_prayer'), (select start from w) - interval '5 days' - interval '3 hours', (select start from w) - interval '5 days', 10800);
select tests.expect_value($$select shortfall_seconds::text from public.get_my_commitment_status(tests.id('new_prayer'))$$, '14400', '3 hours in each week: 4 hours short');
select tests.expect_value($$select this_week_seconds::text from public.get_my_commitment_status(tests.id('new_prayer'))$$, '0', 'nothing yet this week');

-- 7 hours this week: 5 count for this week, 2 pay down the shortfall.
select public.complete_session('50000000-0000-4000-a000-000000000003', tests.id('new_prayer'), now() - interval '7 hours', now(), 25200);
select tests.expect_value($$select shortfall_seconds::text from public.get_my_commitment_status(tests.id('new_prayer'))$$, '7200', 'extra hours this week pay down the shortfall');
select tests.expect_value($$select this_week_seconds::text from public.get_my_commitment_status(tests.id('new_prayer'))$$, '25200', 'this week shows what was prayed');

-- Enough extra hours clear it completely, and it never goes below zero.
select public.complete_session('50000000-0000-4000-a000-000000000004', tests.id('new_prayer'), now() - interval '5 hours', now(), 18000);
select tests.expect_value($$select shortfall_seconds::text from public.get_my_commitment_status(tests.id('new_prayer'))$$, '0', 'praying over the commitment clears the shortfall');

-- Only the caller's own stretches count, and a stranger sees nothing.
select tests.reset();
insert into public.prayer_members (prayer_id, user_id, role) values (tests.id('new_prayer'), tests.uid('member'), 'member');
select tests.act_as('member');
select tests.expect_count($$select 1 from public.get_my_commitment_status(tests.id('new_prayer'))$$, 1, 'a member of the prayer gets their own status');
select tests.expect_value($$select this_week_seconds::text from public.get_my_commitment_status(tests.id('new_prayer'))$$, '0', 'which does not include anyone else''s hours');
select tests.act_as('outsider');
select tests.expect_count($$select 1 from public.get_my_commitment_status(tests.id('new_prayer'))$$, 0, 'a stranger gets nothing');
select tests.act_as_anon();
select tests.expect_error($$select * from public.get_my_commitment_status(tests.id('new_prayer'))$$, '42501', 'a signed-out visitor cannot call it');
