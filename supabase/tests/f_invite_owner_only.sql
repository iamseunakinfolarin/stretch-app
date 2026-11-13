-- 5f. Only the owner can create or reset an invite code, and a reset makes the old code fail.
select tests.act_as('member');
select tests.expect_error($$select public.create_or_reset_invite(tests.id('prayer'))$$, '42501', 'member cannot reset the invite');
select tests.expect_count($$select 1 from public.prayer_invites$$, 0, 'member cannot read the invite row');
select tests.act_as('outsider');
select tests.expect_error($$select public.create_or_reset_invite(tests.id('prayer'))$$, '42501', 'outsider cannot reset the invite');
select tests.act_as_anon();
select tests.expect_error($$select public.create_or_reset_invite(tests.id('prayer'))$$, '42501', 'signed-out visitor cannot reset the invite');

select tests.act_as('owner');
select tests.expect_value($$select code from public.prayer_invites where prayer_id = tests.id('prayer')$$, tests.recall('code'), 'owner reads the current code');
select tests.expect_error($$insert into public.prayer_invites (prayer_id, code, created_by) values (tests.id('prayer'), 'AAAAAAAA', tests.uid('owner'))$$, '42501', 'owner cannot write an invite directly');
select tests.expect_error($$update public.prayer_invites set code = 'AAAAAAAA'$$, '42501', 'owner cannot choose their own code');
select tests.remember('new_code', public.create_or_reset_invite(tests.id('prayer')));
select tests.expect_value($$select tests.recall('new_code') ~ '^[A-HJ-NP-Z2-9]{8}$'$$, 'true', 'new code is 8 characters from A-Z and 2-9 without I and O');
select tests.expect_value($$select tests.recall('new_code') <> tests.recall('code')$$, 'true', 'reset produced a different code');
select tests.expect_count($$select 1 from public.prayer_invites where prayer_id = tests.id('prayer')$$, 1, 'still exactly one invite for the prayer');
select tests.expect_value($$select code from public.prayer_invites where prayer_id = tests.id('prayer')$$, tests.recall('new_code'), 'the stored code is the new one');

select tests.act_as('outsider');
select tests.expect_error(format($$select public.join_prayer_by_code(%L)$$, tests.recall('code')), 'ST001', 'the old code no longer works');
select tests.expect_value(format($$select public.join_prayer_by_code(%L)$$, tests.recall('new_code')), tests.id('prayer')::text, 'the new code works');

-- The database itself refuses badly formed codes.
select tests.reset();
select tests.expect_error($$update public.prayer_invites set code = 'ABCDEFGI'$$, '23514', 'a code containing I is rejected');
select tests.expect_error($$update public.prayer_invites set code = 'ABCDEF10'$$, '23514', 'a code containing 1 or 0 is rejected');
select tests.expect_error($$update public.prayer_invites set code = 'ABCDEFG'$$, '23514', 'a 7 character code is rejected');
