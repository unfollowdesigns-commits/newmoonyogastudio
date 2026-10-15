# Launching a new studio — playbook (≈ 1h30)

One codebase, one folder per studio, and for each studio its **own** Supabase (their data, their account)
and its **own** Vercel project. A fix in the code reaches every studio on their next deploy.

```
GitHub repo (this one) ──► Vercel project "studio-a"  (NEXT_PUBLIC_CLIENT=studio-a) ──► Supabase of studio A
                       └─► Vercel project "newmoon"   (NEXT_PUBLIC_CLIENT=newmoon)  ──► Supabase of New Moon
```

Follow the steps in order. Tick them in the studio's `clients/<id>/README.md`.

---

## 0. Collect from the owner (send this list on WhatsApp)

- Studio name, logo (best quality available), Instagram, WhatsApp number, address + Google Maps link
- Timetable: day, time, class name, length, teacher, room
- Capacity per room (and equipment: mats, hammocks…)
- Prices and how long each pass is valid
- Booking / cancellation rules (how many hours before)
- The studio's Gmail address (sends the login codes) and the owner's phone nearby for Google verification
- A short description of each class (or we write them)

## 1. Studio folder (20 min, us)

```bash
cp -r clients/_template clients/<id>          # id = short, lowercase: "lotus", "sattva"…
python3 scripts/make-icons.py logo.png clients/<id>/brand
```

1. Fill **`clients/<id>/studio.ts`** (New Moon's is a full example). Set `id` = folder name.
2. Register it in **`clients/index.ts`**: `import lotus from "./lotus/studio";` and add it to `CLIENTS`.
3. Generate its database data: `npm run client:sql <id>` → writes `clients/<id>/database.sql`.
4. Edit `email-template.html` (studio name) and `GUIDE-PROPRIETAIRE.md` (rules, prices).
5. Check locally in demo mode: `NEXT_PUBLIC_CLIENT=<id> npm run dev` → http://localhost:3000.
6. Commit and push.

## 2. Supabase — the studio's database (15 min, with the owner)

1. The owner signs up at **supabase.com** with the studio's Gmail → *New project*:
   name `<studio>`, region **West EU (Paris)**, plan **Free**, generate a DB password and let her keep it.
2. *Organization → Team → Invite* `chgang.prod@gmail.com` as **Administrator** (Developer is not enough
   for the Claude connector).
3. **SQL Editor → New query**: paste `supabase/schema.sql` → **Run**. Then a new query with
   `clients/<id>/database.sql` → **Run**.
4. Copy **Project URL** and the **anon public** key (Project Settings → API). Never use `service_role`.

## 3. Login emails (15 min) — do it in this order

Supabase only lets you edit the email once your own sender is set, and its built-in sender allows
**2 emails per hour** — so this step is mandatory before anyone signs up.

1. On the **studio's Gmail**: turn on 2-Step Verification (myaccount.google.com/signinoptions/twosv),
   then create an app password named `Supabase` (myaccount.google.com/apppasswords).
   The owner can do this herself and send you only the 16 letters — it can send emails, not read them.
2. Supabase → **Authentication → Emails → SMTP Settings**: host `smtp.gmail.com`, port `587`,
   username + sender = studio Gmail, password = the 16 letters, sender name = studio name.
   Supabase warns that Gmail is "personal" — save anyway; fine for a studio (≈ 500 emails/day).
3. **Rate Limits** → emails per hour: **30** or more.
4. **Emails → Templates**: paste `clients/<id>/email-template.html` into **Magic Link** *and*
   **Confirm signup**, subject `Votre code <Studio> : {{ .Token }}`. (No link in the email on purpose:
   Gmail's scanner "clicks" links and burns them.)
5. **Sign In / Providers → Email**: Email OTP length **6**.
6. **URL Configuration**: Site URL `https://<project>.vercel.app`, redirect `https://<project>.vercel.app/**`.

## 4. Vercel — the studio's app (10 min)

1. vercel.com → **Add New → Project** → import this GitHub repo. Project name = the address you want
   (`lotusyoga` → lotusyoga.vercel.app).
2. **Environment Variables** (all environments):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_CLIENT` | `<id>` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

3. **Deploy**. Variables only apply to a new deploy — after changing one, *Deployments → ⋯ → Redeploy*.

## 5. Owner access (2 min)

The owner opens `/staff` on her phone and signs in with the studio Gmail once (that creates her account).
Then in Supabase SQL Editor:

```sql
update profiles set role = 'owner' where email in ('studio@gmail.com', 'chgang.prod@gmail.com');
```

She refreshes — every tab appears. Teachers and front desk: she adds them herself in **Équipe**.

## 6. Test before announcing (10 min)

- [ ] Client app shows "Se connecter" (not the demo banner)
- [ ] Sign up with a test email → code arrives from the studio's address → profile → booking works
- [ ] The booking shows in `/staff` on the owner's phone; check-in works; Excel export opens
- [ ] Cancel the test booking
- [ ] Logs: Supabase → Logs → Auth shows `mail.send` with no errors

## 7. Hand over

- [ ] Send `GUIDE-PROPRIETAIRE.md` as PDF on WhatsApp
- [ ] QR code: `python3 scripts/make-qr.py <app url> clients/<id>/brand/logo-512.png clients/<id>/qr/qr-code.svg` — desk card + Instagram story in the same style as `clients/newmoon/qr/`
- [ ] Home-screen shortcut on the owner's phone (Share → Add to Home Screen) for `/staff`
- [ ] Fill the client sheet `clients/<id>/README.md`, status 🟢

---

## Changing things later

| Change | Where |
|---|---|
| Timetable, rooms, prices, texts, colours | `clients/<id>/studio.ts` → push. For timetable/rooms also update the live DB: Supabase → Table Editor → `weekly_slots` / `rooms` (or re-run `database.sql` for *new* rows) |
| Booking rules | the owner, in `/staff` → Règles |
| One class cancelled (holiday) | Table Editor → `sessions` → `cancelled = true` |
| App feature or bug fix | the shared code (`components/`, `lib/`) → every studio gets it |

## Good to know

- **Free plans**: Supabase pauses a project after 7 days with zero activity (a studio with daily bookings
  never hits it; after a long holiday: Supabase → *Restore*). Ask owners to download the two Excel files
  monthly as a backup.
- **Security**: the anon key is public by design; all protection is in the database rules
  (`supabase/schema.sql`). Booking/staff functions are closed to visitors who aren't signed in.
- **Before shipping a change**: `npx tsc --noEmit && npm run build`. Every push to the deploy branch goes
  live for every studio.
