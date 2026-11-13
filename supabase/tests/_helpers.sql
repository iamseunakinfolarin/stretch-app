-- Test helpers. Created inside the test transaction and rolled back with it.
create schema tests;
grant usage on schema tests to anon, authenticated;

create table tests.state (key text primary key, value text);
grant all on tests.state to anon, authenticated;

-- Fixed ids so the tests read clearly.
create function tests.uid(p_who text) returns uuid language sql immutable as $$
  select case p_who
    when 'owner'    then '00000000-0000-4000-a000-000000000001'::uuid
    when 'member'   then '00000000-0000-4000-a000-000000000002'::uuid
    when 'outsider' then '00000000-0000-4000-a000-000000000003'::uuid
  end;
$$;

create function tests.id(p_what text) returns uuid language sql immutable as $$
  select case p_what
    when 'prayer'            then '10000000-0000-4000-a000-000000000001'::uuid  -- owned by owner, member joined
    when 'outsider_prayer'   then '10000000-0000-4000-a000-000000000002'::uuid  -- owned by outsider
    when 'new_prayer'        then '10000000-0000-4000-a000-000000000003'::uuid
    when 'owner_session'     then '20000000-0000-4000-a000-000000000001'::uuid
    when 'member_session'    then '20000000-0000-4000-a000-000000000002'::uuid
    when 'new_session'       then '20000000-0000-4000-a000-000000000003'::uuid
    when 'owner_personal'    then '30000000-0000-4000-a000-000000000001'::uuid
    when 'owner_shared'      then '30000000-0000-4000-a000-000000000002'::uuid
    when 'member_personal'   then '30000000-0000-4000-a000-000000000003'::uuid
    when 'new_note'          then '30000000-0000-4000-a000-000000000004'::uuid
  end;
$$;

-- Become a signed-in user, exactly as the API does: the authenticated role plus JWT claims.
create function tests.act_as(p_who text) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims',
    json_build_object('sub', tests.uid(p_who), 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Become a signed-out visitor.
create function tests.act_as_anon() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end;
$$;

-- Back to the admin role, to check what is really stored.
create function tests.reset() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create function tests.remember(p_key text, p_value text) returns text language sql as $$
  insert into tests.state (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value
  returning 'ok: remembered ' || key;
$$;

create function tests.recall(p_key text) returns text language sql as $$
  select value from tests.state where key = p_key;
$$;

-- The query returns exactly this many rows.
create function tests.expect_count(p_sql text, p_expected bigint, p_label text)
returns text language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) q', p_sql) into n;
  if n is distinct from p_expected then
    raise exception 'FAIL: % (expected % rows, got %)', p_label, p_expected, n;
  end if;
  return 'ok: ' || p_label;
end;
$$;

-- The statement (insert, update, delete or select) succeeds and touches exactly this many rows.
create function tests.expect_affected(p_sql text, p_expected bigint, p_label text)
returns text language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n is distinct from p_expected then
    raise exception 'FAIL: % (expected % rows affected, got %)', p_label, p_expected, n;
  end if;
  return 'ok: ' || p_label;
end;
$$;

-- The query returns this single value (compared as text).
create function tests.expect_value(p_sql text, p_expected text, p_label text)
returns text language plpgsql as $$
declare v text;
begin
  execute format('select (%s)::text', p_sql) into v;
  if v is distinct from p_expected then
    raise exception 'FAIL: % (expected %, got %)', p_label, p_expected, coalesce(v, 'null');
  end if;
  return 'ok: ' || p_label;
end;
$$;

-- The statement fails with this SQLSTATE.
create function tests.expect_error(p_sql text, p_sqlstate text, p_label text)
returns text language plpgsql as $$
declare v_state text; v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_state = p_sqlstate then
      return 'ok: ' || p_label || ' [' || v_state || ']';
    end if;
    raise exception 'FAIL: % (expected error %, got %: %)', p_label, p_sqlstate, v_state, v_msg;
  end;
  raise exception 'FAIL: % (expected error %, but it succeeded)', p_label, p_sqlstate;
end;
$$;
