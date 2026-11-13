-- 5e. join_prayer_by_code works with a valid code, is safe to repeat, and rejects invalid codes
--     and archived prayers.
select tests.act_as('outsider');
select tests.expect_error($$select public.join_prayer_by_code('ZZZZ9999')$$, 'ST001', 'unknown code is rejected');
select tests.expect_error($$select public.join_prayer_by_code('')$$, 'ST001', 'empty code is rejected');
select tests.expect_error($$select public.join_prayer_by_code(null)$$, 'ST001', 'null code is rejected');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('prayer')$$, 0, 'still an outsider after failed attempts');

select tests.expect_value(format($$select public.join_prayer_by_code(%L)$$, '  ' || lower(tests.recall('code')) || ' '), tests.id('prayer')::text, 'valid code joins, even lowercase with spaces');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('prayer')$$, 1, 'new member can read the prayer');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('outsider') and role = 'member'$$, 1, 'joined with the member role');
select tests.expect_value(format($$select public.join_prayer_by_code(%L)$$, tests.recall('code')), tests.id('prayer')::text, 'joining again returns the same prayer');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('outsider')$$, 1, 'joining twice creates no duplicate');

-- The owner joining their own prayer keeps the owner role.
select tests.act_as('owner');
select tests.expect_value(format($$select public.join_prayer_by_code(%L)$$, tests.recall('code')), tests.id('prayer')::text, 'owner using the code is harmless');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('owner') and role = 'owner'$$, 1, 'owner keeps the owner role');

-- Archived prayers can't be joined.
select tests.expect_affected($$delete from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('outsider')$$, 1, 'owner removes the new member');
select tests.expect_affected($$update public.prayers set status = 'archived', archived_at = now() where id = tests.id('prayer')$$, 1, 'owner archives the prayer');
select tests.act_as('outsider');
select tests.expect_error(format($$select public.join_prayer_by_code(%L)$$, tests.recall('code')), 'ST002', 'archived prayer is rejected');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('prayer')$$, 0, 'outsider did not get in');

-- Signed-out visitors can't call it.
select tests.act_as_anon();
select tests.expect_error(format($$select public.join_prayer_by_code(%L)$$, tests.recall('code')), '42501', 'signed-out visitor cannot join');
select tests.reset();
