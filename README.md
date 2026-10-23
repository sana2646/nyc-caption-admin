# NYC Caption Club — Admin

Admin area for NYC Caption Club (shares the same Supabase database).

- **Overview**: stats dashboard (votes per day, activity by hour, funniest themes, hall of fame, most divisive captions, top creators and voters)
- **Users**: read all profiles with activity stats
- **AI Captions**: create, read, update, delete AI-generated captions (with their prompts)
- **Votes**: read all upvotes and downvotes

## Security

Two locks on every route:

1. `proxy.ts` sends anyone without a Google login to `/login`, and anyone whose `profiles.is_superadmin` isn't `TRUE` to `/not-authorized`.
2. Every admin page and server action calls `requireAdmin()` again, and Supabase RLS policies only let superadmins read all profiles or edit/delete captions.

Normal users can't make themselves admin: they only have UPDATE permission on their name and photo columns, not `is_superadmin`.

**How do you avoid locking yourself out?** The first admin is set directly in the Supabase SQL Editor (which uses the database owner role and ignores RLS):

```sql
update profiles set is_superadmin = true
where id = (select id from auth.users where email = 'you@example.com');
```

## Run locally

```
npm install
npm run dev   # http://localhost:3001
```

Needs `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
