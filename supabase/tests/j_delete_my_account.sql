-- 5j. delete_my_account removes only the caller's own data and the prayers they own.
select tests.act_as_anon();
select tests.expect_error($$select public.delete_my_account()$$, '42501', 'signed-out visitor cannot call delete_my_account');

-- The member deletes their account.
select tests.act_as('member');
select public.delete_my_account();
select tests.reset();
select tests.expect_count($$select 1 from auth.users where id = tests.uid('member')$$, 0, 'member: auth user is gone');
select tests.expect_count($$select 1 from public.profiles where id = tests.uid('member')$$, 0, 'member: profile is gone');
select tests.expect_count($$select 1 from public.prayer_members where user_id = tests.uid('member')$$, 0, 'member: memberships are gone');
select tests.expect_count($$select 1 from public.entries where author_id = tests.uid('member')$$, 0, 'member: entries are gone');
select tests.expect_count($$select 1 from public.prayer_sessions where user_id = tests.uid('member')$$, 0, 'member: sessions are gone');
select tests.expect_count($$select 1 from auth.users where id in (tests.uid('owner'), tests.uid('outsider'))$$, 2, 'the other two users are untouched');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('prayer')$$, 1, 'the owner''s prayer is untouched');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('prayer')$$, 2, 'the owner''s prayer points are untouched');
select tests.expect_count($$select 1 from public.scriptures where prayer_id = tests.id('prayer')$$, 1, 'the owner''s scripture is untouched');
select tests.expect_count($$select 1 from public.entries where author_id = tests.uid('owner')$$, 2, 'the owner''s entries are untouched');
select tests.expect_count($$select 1 from public.prayer_sessions where user_id = tests.uid('owner')$$, 1, 'the owner''s session is untouched');
select tests.expect_count($$select 1 from public.prayer_invites where prayer_id = tests.id('prayer')$$, 1, 'the invite is untouched');

-- The owner deletes their account: the prayer they own goes with them.
select tests.act_as('owner');
select public.delete_my_account();
select tests.reset();
select tests.expect_count($$select 1 from auth.users where id = tests.uid('owner')$$, 0, 'owner: auth user is gone');
select tests.expect_count($$select 1 from public.profiles where id = tests.uid('owner')$$, 0, 'owner: profile is gone');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('prayer')$$, 0, 'owner: the prayer they owned is gone');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('prayer')$$, 0, 'owner: its prayer points are gone');
select tests.expect_count($$select 1 from public.scriptures where prayer_id = tests.id('prayer')$$, 0, 'owner: its scriptures are gone');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('prayer')$$, 0, 'owner: its member rows are gone');
select tests.expect_count($$select 1 from public.prayer_invites where prayer_id = tests.id('prayer')$$, 0, 'owner: its invite is gone');
select tests.expect_count($$select 1 from public.entries where prayer_id = tests.id('prayer')$$, 0, 'owner: its entries are gone');
select tests.expect_count($$select 1 from public.prayer_sessions where prayer_id = tests.id('prayer')$$, 0, 'owner: its sessions are gone');
select tests.expect_count($$select 1 from auth.users where id = tests.uid('outsider')$$, 1, 'the outsider still exists');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('outsider_prayer')$$, 1, 'the outsider''s prayer is untouched');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('outsider_prayer') and role = 'owner'$$, 1, 'the outsider''s membership is untouched');
