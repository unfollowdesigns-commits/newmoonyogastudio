# Going live: setup checklist (about 30 minutes)

Until these steps are done the app runs in **demo mode**: it works, but each phone keeps its own data.
After them, every account, booking and check-in lands in one database that the owner owns.

```
Client phone ──► Vercel (the app) ──► Supabase (the owner's database)
                                         ├─ profiles   ← who signed up (name, WhatsApp, email, consent)
                                         ├─ bookings   ← who booked what, check-ins, no-shows, late cancels
                                         ├─ waitlist   ← who is waiting, in order
                                         └─ sessions / weekly_slots ← the timetable
Owner ──► /staff in the app (Membres, Cours & listes, Excel export). She never needs to open Supabase.
```

## 1. The owner creates the database (5 min, on her phone or laptop)

1. Go to **supabase.com** → *Start your project* → sign up with the studio's email (Google sign-in is fine).
2. *New project*:
   - Name: `new-moon-yoga`
   - Database password: click *Generate*, then **save it in her password manager / notes**.
   - Region: **West EU (Paris)** (closest to Tunis).
   - Plan: **Free** (enough for thousands of clients).
3. *Organization settings → Team → Invite* → your email, role **Developer** (or Administrator).

> She owns the account and the data. You can be removed at any time without losing anything.

## 2. Install the database (2 min, you)

Supabase → **SQL Editor** → *New query* → paste the whole file
[`supabase/migrations/0001_studio.sql`](../supabase/migrations/0001_studio.sql) → **Run**.
It creates the tables, the security rules, the booking logic and the real timetable. It is safe to run again.

## 3. Login emails in French with a 6-digit code (5 min)

Supabase → **Authentication**:

1. **Sign In / Providers → Email**: enabled, *Confirm email* ON. Under *Email OTP*, set **length 6**.
2. **URL Configuration**:
   - *Site URL*: your Vercel address, e.g. `https://newmoonyogastudio.vercel.app`
   - *Redirect URLs*: add `https://newmoonyogastudio.vercel.app/**` (and your custom domain later).
3. **Emails → Templates**: in both **Magic Link** and **Confirm signup**, paste the template from
   [`supabase/email-template.html`](../supabase/email-template.html) and set the subject to
   `Votre code New Moon : {{ .Token }}`.
4. **Emails → SMTP Settings** (strongly recommended before launch): Supabase's built-in sender is limited to a few
   emails per hour. Plug in a free sender such as **Resend** or **Brevo** (create an account, verify the
   domain or sender address, copy host / port / user / password here). Sender name: `New Moon Yoga Studio`.

Google sign-in (optional): create an OAuth client in Google Cloud, paste it in *Providers → Google*,
then set `NEXT_PUBLIC_AUTH_GOOGLE=on` in Vercel. Skip it at first: the email code works for everyone.

## 4. Connect Vercel (3 min)

Supabase → **Project Settings → API**: copy *Project URL* and the *anon public* key.

Vercel → your project → **Settings → Environment Variables** (Production + Preview):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key |

Then **Deployments → ⋯ → Redeploy**. The demo banner disappears: the app is live.

(The anon key is meant to be public; all protection is done by the database rules. Never put the
`service_role` key in Vercel.)

## 5. Make the owner the owner (1 min)

1. The owner opens the app, taps **Profil → Se connecter**, and signs up with her email.
2. In Supabase → SQL Editor, run (with her email):

   ```sql
   update profiles set role = 'owner' where email = 'owner-email@example.com';
   ```
3. She opens `/staff` → she now has every tab, including **Équipe**, where she adds Rania and the front
   desk herself (no more SQL ever needed).

## 6. Test before announcing (5 min)

- On your phone: book a class, cancel it, join a full class's waitlist.
- On the owner's phone, in `/staff`: see the booking appear, check someone in, open **Membres**, tap
  **Télécharger (Excel)**.
- Send the owner [`docs/GUIDE-PROPRIETAIRE.md`](GUIDE-PROPRIETAIRE.md).

## Day-to-day for you

- **Change the timetable**: Supabase → Table Editor → `weekly_slots` (add a row or set `active = false`).
  Future classes are generated automatically 14 days ahead. To remove one already-generated date, set
  `cancelled = true` on that row in `sessions`.
- **Capacity**: `rooms.capacity` (or `weekly_slots.capacity` for one class).
- **Backups**: the free plan has no automatic backups you can restore yourself. Ask the owner to download
  the two Excel files from *Membres* once a month, or upgrade to Pro ($25/month) when the studio grows.
- **Free-plan pause**: Supabase pauses free projects after 7 days with zero activity. A studio with
  daily bookings never hits this, but during a long holiday the owner just clicks *Restore* in Supabase.
