# STUDIO NAME — client sheet

Everything about this client in one place. **No passwords in this file** — they live in the services themselves.

**Status: 🟡 setting up** (🟢 live · 🔴 paused)

## Links

| What | Where |
|---|---|
| Client app (share this) | https://STUDIO.vercel.app |
| Staff space | https://STUDIO.vercel.app/staff |
| Database (Supabase) | https://supabase.com/dashboard/project/PROJECT-REF — owned by the studio's account |
| Hosting (Vercel) | project **STUDIO** |
| Instagram | |
| WhatsApp | |
| Address | |

## People & access

| Who | Email | Role in the app |
|---|---|---|
| Owner | | Owner |
| Us (support) | chgang.prod@gmail.com | Owner |

## How it's set up

| Piece | Setting |
|---|---|
| Vercel env | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLIENT=<id>` |
| Database | `supabase/schema.sql` + `clients/<id>/database.sql` |
| Emails sent from | Gmail SMTP, studio address, app password "Supabase" |
| Email rate limit | 30 / hour |
| URL configuration | Site URL + `/**` redirect |

## The studio's data

In [`studio.ts`](studio.ts). Summary: timetable, capacity, rules, prices.

## Still to get from the owner

- [ ]

## Change log

| Date | What |
|---|---|
| | |
