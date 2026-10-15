# Studio booking app

A mobile-first booking app for yoga studios: clients book in two taps, the owner runs everything from
her phone. Built with Next.js 15 + Tailwind CSS 4 + Supabase, hosted on Vercel.

**One codebase, one folder per studio.** Each studio gets its own app address, its own database (in the
owner's account) and its own branding; a fix in the shared code reaches every studio.

| Studio | App | Folder |
|---|---|---|
| New Moon Yoga Studio (Tunis) 🟢 | https://newmoonyogastudio.vercel.app | [`clients/newmoon`](clients/newmoon) |

## Where things are

```
clients/                    ← one folder per studio — the only place a studio is named
  newmoon/
    README.md               ← client sheet: links, accounts, settings, open questions
    studio.ts               ← name, contacts, timetable, rooms, prices, rules, texts, colours
    database.sql            ← its timetable/rooms/rules for Supabase (generated from studio.ts)
    brand/                  ← logo + app icons
    email-template.html     ← login-code email
    GUIDE-PROPRIETAIRE.md   ← owner's guide (French)
  _template/                ← copy this to start a new studio
  index.ts                  ← list of studios
components/, lib/, app/     ← the shared app (never names a studio)
supabase/schema.sql         ← shared database: tables, booking rules, security
scripts/                    ← icons, database data, brand copy
docs/NEW-CLIENT.md          ← step-by-step: launching a new studio
```

## Two interfaces

| Route | For | What it does |
|---|---|---|
| `/` | Clients | 14-day planning + month view, filters, live spots left, 2-tap booking, waitlist, cancellation rules, add to calendar, prices, rules, map/WhatsApp/Instagram. French + English. |
| `/staff` | Owner, teachers, front desk | Rosters with check-in, no-show, late cancel, waitlist promotion, guests; members with WhatsApp and Excel export; suspend a client; rooms & equipment; clock in/out; team access; booking rules. |

## How it works

- **Demo mode** (no Supabase variables): sample data on each device, "Mode démo" banner — handy to show a
  prospect their studio before setting anything up.
- **Live mode**: clients sign in with an emailed 6-digit code, give name + WhatsApp + consent once.
  Capacity, cut-off, late-cancel and waitlist rules run inside the database, so a class can never be
  overbooked, even with two taps at once.

## Commands

```bash
npm install
npm run dev                          # http://localhost:3000 (studio from NEXT_PUBLIC_CLIENT, default newmoon)
NEXT_PUBLIC_CLIENT=lotus npm run dev # preview another studio
npm run client:sql <id>              # regenerate clients/<id>/database.sql after editing studio.ts
python3 scripts/make-icons.py logo.png clients/<id>/brand
npx tsc --noEmit && npm run build    # before every push: each push goes live
```

- New studio: [`docs/NEW-CLIENT.md`](docs/NEW-CLIENT.md)
- Texts (FR/EN): `lib/i18n.tsx`; a studio can override any of them in its `studio.ts` → `text`
- Colours: `app/globals.css`; a studio can override them in its `studio.ts` → `colors`
