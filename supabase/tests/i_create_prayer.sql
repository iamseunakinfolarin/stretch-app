-- 5i. Creating a prayer creates the owner membership, and the creator can read the new prayer
--     straight away.
select tests.act_as('member');
select tests.expect_affected($$insert into public.prayers (id, owner_id, title) values (tests.id('new_prayer'), tests.uid('member'), 'A new prayer') returning id, title$$, 1, 'insert ... returning works for the creator in one statement');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer') and kind = 'prayer' and status = 'active'$$, 1, 'creator reads the new prayer, with the default kind and status');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id = tests.id('new_prayer') and user_id = tests.uid('member') and role = 'owner'$$, 1, 'owner membership row was created');
select tests.expect_affected($$insert into public.prayer_points (prayer_id, body, position) values (tests.id('new_prayer'), 'First point', 0)$$, 1, 'creator can add points straight away');
select tests.expect_value($$select group_seconds from public.get_prayer_hours(array[tests.id('new_prayer')])$$, '0', 'hours are available straight away');

select tests.expect_error($$insert into public.prayers (owner_id, title) values (tests.uid('owner'), 'Not mine')$$, '42501', 'cannot create a prayer owned by someone else');
select tests.expect_error($$update public.prayers set owner_id = tests.uid('owner') where id = tests.id('new_prayer')$$, '42501', 'cannot hand a prayer to someone else');
select tests.expect_error($$insert into public.prayers (owner_id, title, kind, status) values (tests.uid('member'), 'Altar', 'altar', 'planned')$$, '23514', 'an altar cannot be planned');
select tests.expect_error($$insert into public.prayers (owner_id, title, answered_at) values (tests.uid('member'), 'Answered', now())$$, '23514', 'answered_at requires archived status');
select tests.expect_error($$insert into public.prayers (owner_id, title) values (tests.uid('member'), '')$$, '23514', 'an empty title is rejected');
select tests.expect_error(format($$insert into public.prayers (owner_id, title) values (tests.uid('member'), %L)$$, repeat('x', 121)), '23514', 'a 121 character title is rejected');
select tests.expect_affected($$insert into public.prayers (owner_id, title, kind, status, answered_at, archived_at) values (tests.uid('member'), 'Answered altar', 'altar', 'archived', now(), now())$$, 1, 'an answered, archived altar is allowed');

select tests.act_as('owner');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer')$$, 0, 'other people cannot see the new prayer');
select tests.reset();
