-- Invite links open for everyone: someone who is not signed in (and the apps that draw link previews,
-- like iMessage and WhatsApp) can see who is inviting them and to what. Still only the title, the type and
-- the inviter's first name; nothing else about the prayer. Anyone signed in is also told if they are in it.
create or replace function public.preview_invite(code text)
returns table (title text, kind text, owner_first_name text, archived boolean, already_member boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  return query
  select p.title,
         p.kind,
         nullif(split_part(btrim(coalesce(pr.display_name, '')), ' ', 1), ''),
         p.status = 'archived',
         v_uid is not null
           and exists (select 1 from public.prayer_members m where m.prayer_id = p.id and m.user_id = v_uid)
  from public.prayer_invites i
  join public.prayers p on p.id = i.prayer_id
  left join public.profiles pr on pr.id = p.owner_id
  where i.code = upper(btrim(preview_invite.code));
end;
$$;

grant execute on function public.preview_invite(text) to anon;
