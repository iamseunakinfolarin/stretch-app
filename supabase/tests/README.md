# Database tests

These SQL tests prove the security rules of the Stretch database. They act as three signed-in users (owner, member, outsider) and as a signed-out visitor, the same way the API does: the `authenticated` or `anon` role plus the user's JWT claims.

Each test file runs as **one transaction that is rolled back**: `begin`, `_helpers.sql`, `_fixtures.sql`, the test, `rollback`. No test data remains. A failed check raises an error, which fails the file.

## Run against the local database

```bash
npm run db:start
```

```bash
npm run test:db
```

Run one file by part of its name:

```bash
npm run test:db -- e_join
```

The runner only connects to a local database and refuses any other host. The hosted project's database password is never used or stored.

## Run against the hosted project

Print one combined script and run it through the Supabase MCP `execute_sql` tool (or the dashboard SQL editor). Fixtures are built once, each test file runs inside a savepoint, and the script ends in `rollback`, so nothing is left behind. A failed check stops the script with an error naming the check. If it reaches the end, the last line reports that every file ran.

```bash
npm run test:db -- --print-combined
```

The script is about 40 KB. It can be run in parts by passing file-name filters, for example `npm run test:db -- --print-combined a_ b_ c_`.

## What each file proves

| File | Proves |
|---|---|
| `a_outsider_reads_nothing.sql` | An outsider can't read any prayer, point, scripture, member row, invite, session or entry of a prayer they don't belong to. Signed-out visitors can't query tables at all |
| `b_member_read_not_write.sql` | A member can read the prayer, its points, scriptures, shared entries and member list, but can't change the prayer, points or scriptures |
| `c_personal_entries_private.sql` | A member can't read the owner's personal entries, and the owner can't read the member's |
| `d_sessions_private_hours_pooled.sql` | Nobody can read another user's session rows, but `get_prayer_hours` returns the correct group total. Your own stretches and hours stay yours after you leave a prayer |
| `e_join_by_code.sql` | `join_prayer_by_code` works with a valid code, is safe to repeat, and rejects invalid codes and archived prayers |
| `f_invite_owner_only.sql` | Only the owner can create or reset an invite code, and a reset makes the old code fail |
| `g_complete_session.sql` | `complete_session` called twice with the same ids stores one session and one note; a stretch under one minute is discarded (its note is kept); credited time is capped at 24 hours; more than the elapsed time is rejected |
| `h_membership_deletes.sql` | A member can leave; a member can't remove anyone else; the owner can remove a member; nobody can delete the owner row directly |
| `i_create_prayer.sql` | Creating a prayer creates the owner membership, and the creator can read the new prayer straight away |
| `j_delete_my_account.sql` | `delete_my_account` removes only the caller's own data and the prayers they own |
| `k_structure_and_grants.sql` | Eight tables with RLS on, the seven app functions, the profile trigger, the indexes, and exactly which functions and tables each role may use |

## Error codes the app can rely on

| Code | Meaning |
|---|---|
| `ST001` | The invite code is not valid |
| `ST002` | The prayer is archived and can't be joined |
| `42501` | Not allowed (not the owner, not a member, or not signed in) |
| `23514` | A value breaks a rule (for example credited seconds above the elapsed time) |
| `22004` | A required value is missing (session id, credited seconds, or a note id when a note is sent) |

## What `complete_session` returns

| Situation | Result |
|---|---|
| A stretch of one minute or more | Saved. Returns the session id |
| Under one minute | Not saved, no error. Returns `null`. A note sent with it is still saved, without a link to a stretch |
| More than 24 hours of credit | Saved as exactly 24 hours |
| More credit than the time between start and end | Refused with `23514` |
| The same ids sent again | Nothing new is created. Returns the same result |
