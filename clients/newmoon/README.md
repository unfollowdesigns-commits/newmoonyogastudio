# New Moon Yoga Studio — client sheet

Everything about this client in one place. **No passwords in this file** — they live in the services themselves.

**Status: 🟢 live since 15 October 2026**

## Links

| What | Where |
|---|---|
| Client app (share this) | https://newmoonyogastudio.vercel.app |
| Staff space (owner, teachers) | https://newmoonyogastudio.vercel.app/staff |
| Database (Supabase) | https://supabase.com/dashboard/project/utzcosgsyptrbvgxeowl — project **New-moon-yoga**, owned by the studio's account |
| Hosting (Vercel) | project **newmoonyogastudio** (team zonedinout's projects) |
| Instagram | https://www.instagram.com/new_moon_yoga_studio/ |
| Studio WhatsApp | 56 775 096 |
| Address | 5 Rue Kart Hadsht, Les Jardins de Carthage, Tunis — https://maps.app.goo.gl/9tss2c4gsd8VYbKh7 |

## People & access

| Who | Email | Role in the app |
|---|---|---|
| Studio (owner) | newmoonyogastudio31@gmail.com | Owner |
| Houssem (us) | chgang.prod@gmail.com | Owner — for support |
| Rania Sam (teacher, hormonal balance classes) | — | not added yet (owner adds her in **Équipe**) |

Supabase project: owned by the studio's account; chgang.prod@gmail.com is **Administrator** in its organisation.

## How it's set up

| Piece | Setting |
|---|---|
| Vercel env | `NEXT_PUBLIC_SUPABASE_URL=https://utzcosgsyptrbvgxeowl.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/public key), `NEXT_PUBLIC_CLIENT=newmoon` |
| Deploys from | GitHub `unfollowdesigns-commits/newmoonyogastudio`, branch `claude/modest-brown-geeh6u` |
| Database | `supabase/schema.sql` + `clients/newmoon/database.sql`, plus the security hardening (both in the repo) |
| Sign-in | email + 6-digit code (OTP length 6). Google sign-in: off |
| Emails sent from | Gmail SMTP, **newmoonyogastudio31@gmail.com**, with a Google *app password* named "Supabase" (smtp.gmail.com : 587). To revoke: myaccount.google.com/apppasswords on the studio account |
| Email template | `email-template.html` in this folder (Magic Link + Confirm signup) |
| Email rate limit | 30 per hour (Supabase → Authentication → Rate Limits) |
| URL configuration | Site URL `https://newmoonyogastudio.vercel.app`, redirect `https://newmoonyogastudio.vercel.app/**` — **check it's saved** (logs still showed localhost on 15/10) |

## The studio's data (from the owner, Oct 2026)

All in [`studio.ts`](studio.ts). Summary:

- **Timetable**: Mon–Fri 19h30 (1h30) · Wed/Thu/Fri 8h30 *Yoga pour l'équilibre hormonal* with Rania (2h) · Sat 9h & Sun 10h *Yoga air* (1h)
- **Capacity**: 10 per class, 4 for yoga air (4 hammocks)
- **Rules**: book ≥ 8h before · cancel ≥ 2h before (else the class is deducted from the card) · events: cancel ≥ 24h · no-shows may be suspended
- **Prices**: trial 40 DT · 5 = 150 (20 days) · 10 = 280 (1 month) · 15 = 360 (2 months) · 20 = 440 (3 months) · 30 = 670 (4 months) · 50 = 990 (6 months) · unlimited 1540 (1 year). Paid at the studio.
- **Full-moon event**: date calculated automatically each month, booking via WhatsApp

## Still to get from the owner

- [ ] Teachers' names for the evening classes (shown as "Équipe New Moon" for now)
- [ ] Street spelling: "Kart Hadsht" vs "Kart Hadasht"
- [ ] Full-moon event details: time, length, spots, price (could become a bookable class)
- [ ] Does she want card/pack tracking in the app (classes left per client)?

## Handover pack

- [`GUIDE-PROPRIETAIRE.md`](GUIDE-PROPRIETAIRE.md) — owner's guide in French (send as PDF on WhatsApp)
- [`qr/`](qr) — QR code (PNG + SVG for print), desk card A6 (PNG + PDF, 300 dpi), Instagram story. Tested to scan; opens https://newmoonyogastudio.vercel.app

## Change log

| Date | What |
|---|---|
| 15/10/2026 | Live: Supabase installed and hardened, Vercel connected, Gmail sender, owner accounts. First real booking tested (Yoga restoratif, 16/10). |
