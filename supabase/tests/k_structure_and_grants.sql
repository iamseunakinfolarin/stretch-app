-- Structure: eight tables with RLS on, the seven app functions, indexes, triggers,
-- and who may call what.
select tests.expect_count($$select 1 from pg_tables where schemaname = 'public'$$, 8, 'the public schema has exactly eight tables');
select tests.expect_value($$select string_agg(tablename, ',' order by tablename) from pg_tables where schemaname = 'public'$$,
  'entries,prayer_invites,prayer_members,prayer_points,prayer_sessions,prayers,profiles,scriptures', 'the eight tables are the expected ones');
select tests.expect_count($$select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in
  ('ping','create_or_reset_invite','join_prayer_by_code','complete_session','get_prayer_hours','get_my_hours','delete_my_account')$$, 7, 'the seven app functions exist');
select tests.expect_count($$select 1 from pg_trigger t where t.tgrelid = 'auth.users'::regclass and t.tgname = 'on_auth_user_created' and not t.tgisinternal$$, 1, 'the trigger that creates a profile for each new auth user exists');
select tests.expect_count($$select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    and c.relname in ('profiles','prayers','prayer_members','prayer_invites','prayer_points','scriptures','prayer_sessions','entries')$$, 8, 'RLS is enabled on all eight tables');
select tests.expect_count($$select 1 from pg_tables t where schemaname = 'public'
  and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)$$, 0, 'every table has at least one policy');
select tests.expect_count($$select 1 from pg_policies where schemaname = 'public' and roles <> '{authenticated}'$$, 0, 'every policy applies to signed-in users only');
select tests.expect_count($$select 1 from pg_indexes where schemaname = 'public' and indexname in
  ('prayer_members_user_id_idx','prayer_sessions_prayer_id_idx','prayer_sessions_user_started_idx',
   'entries_prayer_created_idx','prayer_points_prayer_position_idx','scriptures_prayer_position_idx')$$, 6, 'the six named indexes exist');
select tests.expect_count($$select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and t.tgname = 'set_updated_at' and not t.tgisinternal$$, 8, 'every table has the updated_at trigger');
select tests.expect_count($$select 1 from information_schema.columns where table_schema = 'public'
  and column_name in ('created_at','updated_at') and data_type = 'timestamp with time zone' and column_default = 'now()'$$, 16, 'every table has created_at and updated_at defaulting to now()');

-- Signed-out visitors: no table access, and ping() is the only function they may call.
select tests.expect_count($$select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
  and has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate')$$, 0, 'anon has no privileges on any table');
select tests.expect_value($$select string_agg(p.proname, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')$$, 'ping', 'ping() is the only function anon may execute');
select tests.expect_value($$select string_agg(p.proname, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')$$,
  'complete_session,create_or_reset_invite,delete_my_account,get_my_hours,get_prayer_hours,join_prayer_by_code,ping,save_prayer',
  'in the API schema, authenticated may execute the app functions and nothing else');
select tests.expect_value($$select string_agg(p.proname, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'$$, 'is_prayer_member,is_prayer_owner,shares_prayer_with', 'the policy helper functions live in the private schema, outside the API');
select tests.expect_value($$select has_schema_privilege('anon', 'private', 'usage')$$, 'false', 'anon cannot use the private schema');
select tests.expect_count($$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and has_function_privilege('anon', p.oid, 'execute')$$, 0, 'anon cannot execute the helper functions');
select tests.expect_value($$select string_agg(p.proname, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute')$$,
  'create_or_reset_invite,delete_my_account,get_prayer_hours,join_prayer_by_code',
  'only the four functions that need elevated rights are SECURITY DEFINER and callable');
select tests.expect_count($$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and not coalesce(p.proconfig, '{}') @> array['search_path=""']$$, 0, 'every function has an empty search_path');

-- Signed-in users have only the table privileges the policies can use.
select tests.expect_value($$select has_table_privilege('authenticated', 'public.prayer_members', 'insert, update')$$, 'false', 'authenticated cannot insert or update member rows');
select tests.expect_value($$select has_table_privilege('authenticated', 'public.prayer_invites', 'insert, update, delete')$$, 'false', 'authenticated cannot write invites');
select tests.expect_value($$select has_table_privilege('authenticated', 'public.prayer_sessions', 'update, delete')$$, 'false', 'authenticated cannot update or delete sessions');
select tests.expect_value($$select has_table_privilege('authenticated', 'public.profiles', 'insert, delete')$$, 'false', 'authenticated cannot insert or delete profiles');
select tests.expect_value($$select bool_and(has_table_privilege('authenticated', c.oid, 'select')) from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'$$, 'true', 'authenticated can select from every table, with RLS as the gate');

-- Triggers do their work.
select tests.expect_count($$select 1 from public.profiles where id in (tests.uid('owner'), tests.uid('member'), tests.uid('outsider')) and display_name is null$$, 3, 'a profile row was created for each new auth user');
select tests.expect_affected($$update public.prayers set updated_at = '2000-01-01' where id = tests.id('prayer')$$, 1, 'touch a row');
select tests.expect_value($$select updated_at > '2001-01-01' from public.prayers where id = tests.id('prayer')$$, 'true', 'the updated_at trigger overrides the value on update');

-- Profiles: a signed-in user can set their own display name, within 1 to 40 characters.
select tests.act_as('owner');
select tests.expect_affected($$update public.profiles set display_name = 'Grace' where id = tests.uid('owner')$$, 1, 'a user can set their own display name');
select tests.expect_error($$update public.profiles set display_name = '' where id = tests.uid('owner')$$, '23514', 'an empty display name is rejected');
select tests.expect_error(format($$update public.profiles set display_name = %L where id = tests.uid('owner')$$, repeat('x', 41)), '23514', 'a 41 character display name is rejected');

-- ping() answers signed-out visitors.
select tests.act_as_anon();
select tests.expect_value($$select public.ping()$$, 'ok', 'anon can call ping()');
select tests.reset();
