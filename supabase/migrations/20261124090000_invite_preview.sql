-- Invite preview: before joining, a signed-in person holding a valid invite code can see what they are
-- joining: the prayer's title and type, and the first name of the person who invited them. Nothing else.
-- It needs elevated rights because a person who is not yet a member cannot read the prayer.
create function public.preview_invite(code text)
returns table (title text, kind text, owner_first_name text, archived boolean, already_member boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  return query
  select p.title,
         p.kind,
         nullif(split_part(btrim(coalesce(pr.display_name, '')), ' ', 1), ''),
         p.status = 'archived',
         exists (select 1 from public.prayer_members m where m.prayer_id = p.id and m.user_id = v_uid)
  from public.prayer_invites i
  join public.prayers p on p.id = i.prayer_id
  left join public.profiles pr on pr.id = p.owner_id
  where i.code = upper(btrim(preview_invite.code));
end;
$$;

revoke all on function public.preview_invite(text) from public, anon;
grant execute on function public.preview_invite(text) to authenticated;
