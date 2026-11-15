-- Thanksgiving: categories are private to their owner; a thanksgiving is its author's, and one that is shared
-- is also readable by the people in its linked prayer, and no one else. Rules on names, titles and links hold.

-- An outsider (not in the fixture prayer) keeps a private thanksgiving and a category.
select tests.act_as('outsider');
select tests.expect_affected($$insert into public.thanksgiving_categories (id, owner_id, name, glow) values ('60000000-0000-4000-a000-000000000001', tests.uid('outsider'), 'Healing', 'rose')$$, 1, 'a person can create a category');
select tests.expect_affected($$insert into public.thanksgivings (id, author_id, category_id, title, body) values ('61000000-0000-4000-a000-000000000001', tests.uid('outsider'), '60000000-0000-4000-a000-000000000001', 'Mum walked into church', 'After months in bed, she walked in on her own.')$$, 1, 'and a thanksgiving in it, with no prayer needed');
select tests.expect_count($$select 1 from public.thanksgivings where happened_on = current_date and visibility = 'personal'$$, 1, 'it defaults to today and to private');

-- Names, titles and bodies are checked by the database.
select tests.expect_error($$insert into public.thanksgiving_categories (owner_id, name) values (tests.uid('outsider'), ' healing ')$$, '23505', 'a category name cannot repeat, ignoring capitals and spaces');
select tests.expect_error($$insert into public.thanksgiving_categories (owner_id, name) values (tests.uid('outsider'), repeat('x', 41))$$, '23514', 'a category name over 40 characters is rejected');
select tests.expect_error($$insert into public.thanksgiving_categories (owner_id, name) values (tests.uid('outsider'), '   ')$$, '23514', 'a blank category name is rejected');
select tests.expect_error($$insert into public.thanksgiving_categories (owner_id, name, glow) values (tests.uid('outsider'), 'Other', 'pink')$$, '23514', 'a glow outside the palette is rejected');
select tests.expect_error($$insert into public.thanksgivings (author_id, title, body) values (tests.uid('outsider'), repeat('x', 81), 'Body')$$, '23514', 'a title over 80 characters is rejected');
select tests.expect_error($$insert into public.thanksgivings (author_id, title, body) values (tests.uid('outsider'), '  ', 'Body')$$, '23514', 'a blank title is rejected');
select tests.expect_error($$insert into public.thanksgivings (author_id, title, body) values (tests.uid('outsider'), 'Title', ' ')$$, '23514', 'a blank body is rejected');
select tests.expect_error($$insert into public.thanksgivings (author_id, title, body) values (tests.uid('outsider'), 'Title', repeat('x', 5001))$$, '23514', 'a body over 5,000 characters is rejected');
select tests.expect_error($$insert into public.thanksgivings (author_id, title, body, visibility) values (tests.uid('outsider'), 'Title', 'Body', 'public')$$, '23514', 'a visibility other than private or shared is rejected');

-- Links must be to things the author may use.
select tests.expect_error($$insert into public.thanksgivings (author_id, prayer_id, title, body) values (tests.uid('outsider'), tests.id('prayer'), 'Title', 'Body')$$, '42501', 'a thanksgiving cannot be linked to a prayer its author is not in');
select tests.expect_error($$insert into public.thanksgivings (author_id, title, body) values (tests.uid('owner'), 'Title', 'Body')$$, '42501', 'nobody can write a thanksgiving in someone else''s name');

-- The owner of the fixture prayer: one private and one shared thanksgiving linked to it, in a category of their own.
select tests.act_as('owner');
select tests.expect_affected($$insert into public.thanksgiving_categories (id, owner_id, name, glow) values ('60000000-0000-4000-a000-000000000002', tests.uid('owner'), 'Provision', 'gold')$$, 1, 'the owner creates their own category');
select tests.expect_error($$insert into public.thanksgivings (author_id, category_id, title, body) values (tests.uid('owner'), '60000000-0000-4000-a000-000000000001', 'Title', 'Body')$$, '42501', 'a thanksgiving cannot be filed in someone else''s category');
select tests.expect_affected($$insert into public.thanksgivings (id, author_id, prayer_id, category_id, title, body, visibility) values ('61000000-0000-4000-a000-000000000002', tests.uid('owner'), tests.id('prayer'), '60000000-0000-4000-a000-000000000002', 'The rent was paid', 'An envelope arrived with exactly what we needed.', 'shared')$$, 1, 'the owner shares a thanksgiving linked to the prayer');
select tests.expect_affected($$insert into public.thanksgivings (id, author_id, prayer_id, title, body) values ('61000000-0000-4000-a000-000000000003', tests.uid('owner'), tests.id('prayer'), 'A private thank you', 'Just between me and God.')$$, 1, 'and keeps one private, also linked');
select tests.expect_count($$select 1 from public.thanksgivings$$, 2, 'the owner reads both of their own');

-- A member sees the shared one only.
select tests.act_as('member');
select tests.expect_count($$select 1 from public.thanksgivings$$, 1, 'a member sees one thanksgiving');
select tests.expect_count($$select 1 from public.thanksgivings where id = '61000000-0000-4000-a000-000000000002'$$, 1, 'the shared one');
select tests.expect_count($$select 1 from public.thanksgiving_categories$$, 0, 'and none of the owner''s categories');
select tests.expect_affected($$update public.thanksgivings set title = 'Changed' where id = '61000000-0000-4000-a000-000000000002'$$, 0, 'a member cannot change it');
select tests.expect_affected($$delete from public.thanksgivings where id = '61000000-0000-4000-a000-000000000002'$$, 0, 'or delete it');

-- An outsider sees none of it.
select tests.act_as('outsider');
select tests.expect_count($$select 1 from public.thanksgivings where author_id = tests.uid('owner')$$, 0, 'an outsider sees nothing of the owner''s');
select tests.expect_count($$select 1 from public.thanksgiving_categories where owner_id = tests.uid('owner')$$, 0, 'nor their categories');
select tests.act_as('owner');
select tests.expect_count($$select 1 from public.thanksgivings where author_id = tests.uid('outsider')$$, 0, 'and the owner sees nothing of the outsider''s');

-- After leaving the prayer, a member no longer sees what was shared with it.
select tests.act_as('member');
select tests.expect_affected($$delete from public.prayer_members where prayer_id = tests.id('prayer') and user_id = tests.uid('member')$$, 1, 'the member leaves the prayer');
select tests.expect_count($$select 1 from public.thanksgivings$$, 0, 'and no longer sees the shared thanksgiving');

-- Deleting a category or a prayer keeps the thanksgiving, unlinked.
select tests.act_as('owner');
select tests.expect_affected($$delete from public.thanksgiving_categories where id = '60000000-0000-4000-a000-000000000002'$$, 1, 'a category can be deleted');
select tests.expect_count($$select 1 from public.thanksgivings where id = '61000000-0000-4000-a000-000000000002' and category_id is null$$, 1, 'its thanksgiving stays, without a category');
select tests.reset();
delete from public.prayers where id = tests.id('prayer');
select tests.expect_count($$select 1 from public.thanksgivings where id in ('61000000-0000-4000-a000-000000000002', '61000000-0000-4000-a000-000000000003') and prayer_id is null$$, 2, 'deleting a prayer keeps its thanksgivings, without the link');

-- Signed-out visitors have no access.
select tests.act_as_anon();
select tests.expect_error($$select 1 from public.thanksgivings$$, '42501', 'a signed-out visitor cannot read thanksgivings');
select tests.expect_error($$select 1 from public.thanksgiving_categories$$, '42501', 'or categories');
