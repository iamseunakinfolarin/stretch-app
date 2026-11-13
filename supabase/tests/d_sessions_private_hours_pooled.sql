-- 5d. A member can't read another user's session rows, but get_prayer_hours returns the
--     correct group total. (Fixtures: owner 600 seconds, member 900 seconds.)
select tests.act_as('member');
select tests.expect_count($$select 1 from public.prayer_sessions where user_id = tests.uid('owner')$$, 0, 'member cannot read the owner''s session rows');
select tests.expect_count($$select 1 from public.prayer_sessions where prayer_id = tests.id('prayer')$$, 1, 'member reads only their own session row');
select tests.expect_value($$select my_seconds from public.get_prayer_hours(array[tests.id('prayer')])$$, '900', 'member: my_seconds is 900');
select tests.expect_value($$select group_seconds from public.get_prayer_hours(array[tests.id('prayer')])$$, '1500', 'member: group_seconds is 1500');
select tests.expect_value($$select all_time_seconds from public.get_my_hours(now() - interval '90 minutes')$$, '900', 'member: all-time hours');
select tests.expect_value($$select since_seconds from public.get_my_hours(now() - interval '90 minutes')$$, '900', 'member: hours since 90 minutes ago');
select tests.expect_value($$select since_seconds from public.get_my_hours(now())$$, '0', 'member: nothing since now');
select tests.expect_error($$update public.prayer_sessions set credited_seconds = 1200$$, '42501', 'member cannot update session rows');
select tests.expect_error($$delete from public.prayer_sessions$$, '42501', 'member cannot delete session rows');
select tests.expect_error($$insert into public.prayer_sessions (prayer_id, user_id, started_at, ended_at, credited_seconds) values (tests.id('prayer'), tests.uid('owner'), now() - interval '1 hour', now(), 600)$$, '42501', 'member cannot log a session as someone else');

select tests.act_as('owner');
select tests.expect_count($$select 1 from public.prayer_sessions where user_id = tests.uid('member')$$, 0, 'owner cannot read the member''s session rows');
select tests.expect_value($$select my_seconds from public.get_prayer_hours(array[tests.id('prayer')])$$, '600', 'owner: my_seconds is 600');
select tests.expect_value($$select group_seconds from public.get_prayer_hours(array[tests.id('prayer')])$$, '1500', 'owner: group_seconds is 1500');
select tests.expect_count($$select * from public.get_prayer_hours(array[tests.id('prayer'), tests.id('outsider_prayer')])$$, 1, 'hours come back only for prayers the caller belongs to');

select tests.act_as('outsider');
select tests.expect_value($$select group_seconds from public.get_prayer_hours(array[tests.id('outsider_prayer')])$$, '0', 'a prayer with no stretches reports zero');
select tests.expect_value($$select all_time_seconds from public.get_my_hours(now() - interval '1 day')$$, '0', 'outsider has no hours');
select tests.reset();
