-- 5c. A member can't read the owner's personal entries, and the owner can't read the member's.
select tests.act_as('member');
select tests.expect_count($$select 1 from public.entries where id = tests.id('owner_personal')$$, 0, 'member cannot read the owner''s personal entry');
select tests.expect_count($$select 1 from public.entries where author_id = tests.uid('owner') and visibility = 'personal'$$, 0, 'member sees no personal entries by the owner');
select tests.expect_count($$select 1 from public.entries where id = tests.id('member_personal')$$, 1, 'member reads their own personal entry');
select tests.expect_count($$select 1 from public.entries where prayer_id = tests.id('prayer')$$, 2, 'member sees their own entry plus the shared one');
select tests.expect_affected($$update public.entries set body = 'Hijacked' where id = tests.id('owner_shared')$$, 0, 'member cannot edit the owner''s shared entry');
select tests.expect_affected($$delete from public.entries where id = tests.id('owner_shared')$$, 0, 'member cannot delete the owner''s shared entry');

select tests.act_as('owner');
select tests.expect_count($$select 1 from public.entries where id = tests.id('member_personal')$$, 0, 'owner cannot read the member''s personal entry');
select tests.expect_count($$select 1 from public.entries where author_id = tests.uid('member')$$, 0, 'owner sees no personal entries by the member');
select tests.expect_count($$select 1 from public.entries where prayer_id = tests.id('prayer')$$, 2, 'owner sees only their own two entries');
select tests.expect_affected($$delete from public.entries where id = tests.id('member_personal')$$, 0, 'owner cannot delete the member''s personal entry');

-- Sharing is the author's choice: once the member shares it, the owner can read it.
select tests.act_as('member');
select tests.expect_affected($$update public.entries set visibility = 'shared' where id = tests.id('member_personal')$$, 1, 'member can share their own entry');
select tests.act_as('owner');
select tests.expect_count($$select 1 from public.entries where id = tests.id('member_personal')$$, 1, 'owner reads the entry once it is shared');
select tests.reset();
