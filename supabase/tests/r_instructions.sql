-- Instructions and rituals: your own are yours; shared ones are readable by the people in that prayer only;
-- you can only write on a prayer you are in; the fields fit the kind; they go when the prayer goes.

select tests.act_as('owner');
select tests.expect_affected($$insert into public.prayer_instructions (id, prayer_id, author_id, body) values ('70000000-0000-4000-a000-000000000001', tests.id('prayer'), tests.uid('owner'), 'Call your brother today')$$, 1, 'the owner writes down an instruction');
select tests.expect_count($$select 1 from public.prayer_instructions where kind = 'instruction' and received_on = current_date and visibility = 'personal'$$, 1, 'it defaults to an instruction, received today, private');
select tests.expect_affected($$insert into public.prayer_instructions (id, prayer_id, author_id, kind, body, frequency, visibility) values ('70000000-0000-4000-a000-000000000002', tests.id('prayer'), tests.uid('owner'), 'ritual', 'Pray at 5am', 'Daily', 'shared')$$, 1, 'and a shared ritual with how often');
select tests.expect_affected($$update public.prayer_instructions set done_on = current_date where id = '70000000-0000-4000-a000-000000000001'$$, 1, 'an instruction can be marked done');
select tests.expect_affected($$update public.prayer_instructions set kind = 'ritual', frequency = 'Every Sunday', done_on = null where id = '70000000-0000-4000-a000-000000000001'$$, 1, 'and made into a ritual on the same prayer');

-- The fields must fit the kind.
select tests.expect_error($$insert into public.prayer_instructions (prayer_id, author_id, kind, body) values (tests.id('prayer'), tests.uid('owner'), 'ritual', 'No frequency')$$, '23514', 'a ritual needs how often');
select tests.expect_error($$insert into public.prayer_instructions (prayer_id, author_id, body, frequency) values (tests.id('prayer'), tests.uid('owner'), 'Once', 'Daily')$$, '23514', 'an instruction has no frequency');
select tests.expect_error($$insert into public.prayer_instructions (prayer_id, author_id, kind, body, frequency, done_on) values (tests.id('prayer'), tests.uid('owner'), 'ritual', 'Pray', 'Daily', current_date)$$, '23514', 'a ritual is never done once');
select tests.expect_error($$insert into public.prayer_instructions (prayer_id, author_id, body) values (tests.id('prayer'), tests.uid('owner'), '  ')$$, '23514', 'a blank instruction is rejected');
select tests.expect_error($$insert into public.prayer_instructions (prayer_id, author_id, body) values (tests.id('prayer'), tests.uid('owner'), repeat('x', 501))$$, '23514', 'more than 500 characters is rejected');
select tests.expect_error($$insert into public.prayer_instructions (prayer_id, author_id, kind, body) values (tests.id('prayer'), tests.uid('owner'), 'command', 'x')$$, '23514', 'only instruction or ritual');
select tests.expect_error($$insert into public.prayer_instructions (prayer_id, author_id, body) values (tests.id('prayer'), tests.uid('member'), 'In their name')$$, '42501', 'nobody writes in someone else''s name');

-- A member sees the shared ritual only, writes their own, and cannot change the owner's.
select tests.act_as('member');
select tests.expect_count($$select 1 from public.prayer_instructions$$, 1, 'a member sees only what is shared');
select tests.expect_affected($$insert into public.prayer_instructions (id, prayer_id, author_id, body) values ('70000000-0000-4000-a000-000000000003', tests.id('prayer'), tests.uid('member'), 'Fast on Friday')$$, 1, 'a member writes down their own');
select tests.expect_affected($$update public.prayer_instructions set body = 'Changed' where id = '70000000-0000-4000-a000-000000000002'$$, 0, 'a member cannot change the owner''s');
select tests.expect_affected($$delete from public.prayer_instructions where id = '70000000-0000-4000-a000-000000000002'$$, 0, 'or delete it');
select tests.act_as('owner');
select tests.expect_count($$select 1 from public.prayer_instructions where author_id = tests.uid('member')$$, 0, 'the owner does not see the member''s private one');

-- An outsider sees nothing and cannot write on the prayer.
select tests.act_as('outsider');
select tests.expect_count($$select 1 from public.prayer_instructions$$, 0, 'an outsider sees nothing');
select tests.expect_error($$insert into public.prayer_instructions (prayer_id, author_id, body) values (tests.id('prayer'), tests.uid('outsider'), 'Sneaky')$$, '42501', 'and cannot write on a prayer they are not in');

-- They go when the prayer goes.
select tests.reset();
delete from public.prayers where id = tests.id('prayer');
select tests.expect_count($$select 1 from public.prayer_instructions$$, 0, 'deleting the prayer removes its instructions and rituals');

select tests.act_as_anon();
select tests.expect_error($$select 1 from public.prayer_instructions$$, '42501', 'a signed-out visitor has no access');
