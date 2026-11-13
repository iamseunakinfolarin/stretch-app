-- 5h. A member can leave; a member can't remove anyone else; the owner can remove a member;
--     nobody can delete the owner row directly.
select tests.act_as('outsider');
select public.join_prayer_by_code(tests.recall('code'));  -- a second member, so there is someone else to remove

select tests.act_as('member');
select tests.expect_affected($$delete from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('outsider')$$, 0, 'member cannot remove another member');
select tests.expect_affected($$delete from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('owner')$$, 0, 'member cannot remove the owner');
select tests.expect_error($$insert into public.prayer_members (prayer_id, user_id, role) values (tests.id('outsider_prayer'), tests.uid('member'), 'member')$$, '42501', 'nobody inserts member rows directly');
select tests.expect_error($$update public.prayer_members set role = 'owner' where user_id = tests.uid('member')$$, '42501', 'nobody can promote themselves');

select tests.act_as('owner');
select tests.expect_affected($$delete from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('owner')$$, 0, 'owner cannot delete their own owner row');
select tests.expect_affected($$delete from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('outsider')$$, 1, 'owner removes a member');

select tests.act_as('outsider');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('prayer')$$, 0, 'the removed member loses access');

select tests.act_as('member');
select tests.expect_affected($$delete from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('member')$$, 1, 'member leaves');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('prayer')$$, 0, 'after leaving, the prayer is no longer readable');
select tests.expect_count($$select 1 from public.entries where id = tests.id('owner_shared')$$, 0, 'after leaving, shared entries are no longer readable');

select tests.reset();
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('prayer')$$, 1, 'only one member row remains');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('owner') and role = 'owner'$$, 1, 'and it is the owner row');
select tests.expect_error($$insert into public.prayer_members (prayer_id, user_id, role) values (tests.id('prayer'), tests.uid('member'), 'owner')$$, '23505', 'a prayer can never have two owners');
