-- preview_invite: a signed-in person with a valid code sees only the title, type, the inviter's first name,
-- whether it is archived and whether they are already in it. A wrong code shows nothing. Signed-out visitors
-- (and link-preview apps) see the same few things, and are never told they are a member.
select tests.act_as('owner');
update public.profiles set display_name = 'Grace Owner' where id = tests.uid('owner');
select tests.remember('code', public.create_or_reset_invite(tests.id('prayer')));

select tests.act_as('outsider');
select tests.expect_count(format($$select 1 from public.preview_invite(%L)$$, tests.recall('code')), 1, 'an outsider with the code sees one preview');
select tests.expect_value(format($$select title || ' | ' || kind || ' | ' || owner_first_name from public.preview_invite(%L)$$, tests.recall('code')), 'For my family | prayer | Grace', 'it shows the title, the type and the inviter''s first name only');
select tests.expect_value(format($$select (not archived and not already_member)::text from public.preview_invite(lower(%L))$$, tests.recall('code')), 'true', 'it works in lower case, and says they are not in it yet');
select tests.expect_count($$select 1 from public.preview_invite('WRONGCDE')$$, 0, 'a wrong code shows nothing');
select tests.expect_count($$select 1 from public.prayers where id = tests.id('prayer')$$, 0, 'the preview does not open the prayer itself');

select tests.act_as('member');
select tests.expect_value(format($$select already_member::text from public.preview_invite(%L)$$, tests.recall('code')), 'true', 'a member is told they are already in it');

select tests.act_as('owner');
select tests.expect_affected($$update public.prayers set status = 'archived' where id = tests.id('prayer')$$, 1, 'the owner archives the prayer');
select tests.act_as('outsider');
select tests.expect_value(format($$select archived::text from public.preview_invite(%L)$$, tests.recall('code')), 'true', 'the preview says it is archived');

select tests.act_as_anon();
select tests.expect_value(format($$select title || ' | ' || owner_first_name || ' | ' || already_member from public.preview_invite(%L)$$, tests.recall('code')), 'For my family | Grace | false', 'a signed-out visitor sees the same preview, and is not a member');
select tests.expect_count($$select 1 from public.preview_invite('WRONGCDE')$$, 0, 'and a wrong code still shows nothing');
select tests.expect_error($$select 1 from public.prayers$$, '42501', 'but still cannot read prayers');
