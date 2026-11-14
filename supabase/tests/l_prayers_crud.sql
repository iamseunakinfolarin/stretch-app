-- Prayers belong to their owner: a person can create, read, update and delete only their own.
-- Prayer points and key scriptures follow their prayer's access, and go when the prayer goes.

-- A person creates a prayer with a point and a scripture, and can read and change all of it.
select tests.act_as('outsider');
select tests.expect_affected($$insert into public.prayers (id, owner_id, kind, title, target_hours, planned_start_date, planned_end_date)
  values (tests.id('new_prayer'), tests.uid('outsider'), 'prayer', 'A new job for David', 40, '2026-12-01', '2026-12-31') returning id$$, 1, 'a person can create a prayer with a plan');
select tests.expect_affected($$insert into public.prayer_points (prayer_id, body, position) values (tests.id('new_prayer'), 'Favour in interviews', 0)$$, 1, 'and add a prayer point to it');
select tests.expect_affected($$insert into public.scriptures (prayer_id, reference, position) values (tests.id('new_prayer'), 'Proverbs 3:5-6', 0)$$, 1, 'and add a key scripture to it');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer') and target_hours = 40 and planned_end_date = '2026-12-31'$$, 1, 'they read their own prayer and its plan');
select tests.expect_affected($$update public.prayers set title = 'A new job for David and Ruth' where id = tests.id('new_prayer')$$, 1, 'they can update their own prayer');
select tests.expect_affected($$update public.prayer_points set body = 'Favour in every interview' where prayer_id = tests.id('new_prayer')$$, 1, 'they can update their own prayer point');
select tests.expect_affected($$update public.scriptures set translation = 'NKJV' where prayer_id = tests.id('new_prayer')$$, 1, 'they can update their own scripture');

-- The plan has rules.
select tests.expect_error($$update public.prayers set target_hours = 0 where id = tests.id('new_prayer')$$, '23514', 'a target of 0 hours is rejected');
select tests.expect_error($$update public.prayers set target_hours = 10001 where id = tests.id('new_prayer')$$, '23514', 'a target above 10,000 hours is rejected');
select tests.expect_error($$update public.prayers set planned_end_date = '2026-11-30' where id = tests.id('new_prayer')$$, '23514', 'an end date before the start date is rejected');
select tests.expect_error($$update public.prayers set planned_start_date = null where id = tests.id('new_prayer')$$, '23514', 'an end date needs a start date');
select tests.expect_affected($$update public.prayers set target_hours = null, planned_start_date = null, planned_end_date = null where id = tests.id('new_prayer')$$, 1, 'the plan is optional and can be cleared');

-- Another person cannot read or change any of it.
select tests.act_as('owner');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('new_prayer')$$, 0, 'another person cannot read the prayer');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('new_prayer')$$, 0, 'another person cannot read its prayer points');
select tests.expect_count($$select 1 from public.scriptures where prayer_id = tests.id('new_prayer')$$, 0, 'another person cannot read its scriptures');
select tests.expect_affected($$update public.prayers set title = 'Hijacked' where id = tests.id('new_prayer')$$, 0, 'another person cannot update the prayer');
select tests.expect_affected($$update public.prayers set status = 'archived', archived_at = now() where id = tests.id('new_prayer')$$, 0, 'another person cannot archive the prayer');
select tests.expect_affected($$delete from public.prayers where id = tests.id('new_prayer')$$, 0, 'another person cannot delete the prayer');
select tests.expect_affected($$update public.prayer_points set body = 'Hijacked' where prayer_id = tests.id('new_prayer')$$, 0, 'another person cannot update its prayer points');
select tests.expect_affected($$delete from public.prayer_points where prayer_id = tests.id('new_prayer')$$, 0, 'another person cannot delete its prayer points');
select tests.expect_error($$insert into public.prayer_points (prayer_id, body, position) values (tests.id('new_prayer'), 'Sneaky', 1)$$, '42501', 'another person cannot add a prayer point to it');
select tests.expect_affected($$update public.scriptures set reference = 'Hijacked' where prayer_id = tests.id('new_prayer')$$, 0, 'another person cannot update its scriptures');
select tests.expect_affected($$delete from public.scriptures where prayer_id = tests.id('new_prayer')$$, 0, 'another person cannot delete its scriptures');
select tests.expect_error($$insert into public.scriptures (prayer_id, reference, position) values (tests.id('new_prayer'), 'John 3:16', 1)$$, '42501', 'another person cannot add a scripture to it');
select tests.expect_error($$update public.prayer_points set prayer_id = tests.id('new_prayer') where prayer_id = tests.id('prayer')$$, '42501', 'a person cannot move their own points into someone else''s prayer');

-- Nothing changed.
select tests.reset();
select tests.expect_value($$select title from public.prayers where id = tests.id('new_prayer')$$, 'A new job for David and Ruth', 'the prayer is unchanged');
select tests.expect_value($$select body from public.prayer_points where prayer_id = tests.id('new_prayer')$$, 'Favour in every interview', 'its prayer point is unchanged');
select tests.expect_value($$select reference from public.scriptures where prayer_id = tests.id('new_prayer')$$, 'Proverbs 3:5-6', 'its scripture is unchanged');

-- Points and scriptures follow the prayer's access: a member reads them, and stops when they leave.
select tests.act_as('member');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('prayer')$$, 2, 'a member reads the points of a prayer they joined');
select tests.expect_count($$select 1 from public.scriptures where prayer_id = tests.id('prayer')$$, 1, 'and its scriptures');
select tests.expect_affected($$delete from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('member')$$, 1, 'the member leaves');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('prayer')$$, 0, 'after leaving they cannot read its points');
select tests.expect_count($$select 1 from public.scriptures where prayer_id = tests.id('prayer')$$, 0, 'or its scriptures');

-- Archive and reactivate are the owner's to do.
select tests.act_as('outsider');
select tests.expect_affected($$update public.prayers set status = 'archived', archived_at = now() where id = tests.id('new_prayer')$$, 1, 'the owner archives their prayer');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id = tests.id('new_prayer')$$, 1, 'an archived prayer keeps its points');
select tests.expect_affected($$update public.prayers set status = 'active', archived_at = null where id = tests.id('new_prayer')$$, 1, 'the owner reactivates it');

-- Deleting a prayer removes everything under it, and nothing else.
select tests.expect_affected($$delete from public.prayers where id = tests.id('new_prayer')$$, 1, 'the owner deletes their own prayer');
select tests.act_as('owner');
select tests.expect_affected($$delete from public.prayers where id = tests.id('prayer')$$, 1, 'the other owner deletes theirs');
select tests.reset();
select tests.expect_count($$select 1 from public.prayers where id in (tests.id('new_prayer'), tests.id('prayer'))$$, 0, 'both prayers are gone');
select tests.expect_count($$select 1 from public.prayer_points where prayer_id in (tests.id('new_prayer'), tests.id('prayer'))$$, 0, 'their prayer points are gone');
select tests.expect_count($$select 1 from public.scriptures where prayer_id in (tests.id('new_prayer'), tests.id('prayer'))$$, 0, 'their scriptures are gone');
select tests.expect_count($$select 1 from public.prayer_members where prayer_id in (tests.id('new_prayer'), tests.id('prayer'))$$, 0, 'their member rows are gone');
select tests.expect_count($$select 1 from public.prayer_invites where prayer_id = tests.id('prayer')$$, 0, 'the invite is gone');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('outsider_prayer')$$, 1, 'a prayer that was not deleted is untouched');
select tests.expect_count($$select 1 from auth.users where id in (tests.uid('owner'), tests.uid('member'), tests.uid('outsider'))$$, 3, 'no person was removed');
