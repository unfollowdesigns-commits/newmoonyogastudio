# New Moon Yoga Studio

A mobile-first booking app for **New Moon Yoga Studio** (Les Jardins de Carthage, Tunis). Built with Next.js 15 + Tailwind CSS 4. It deploys to Vercel with no configuration.

## Two interfaces

| Route    | For            | What it does |
|----------|----------------|--------------|
| `/`      | Clients        | 14-day calendar strip + month view, filters by style / instructor / level / room / time of day, live spots-left counts, one-tap booking, waitlists, cancellation with a late-cancel warning, and "Add to calendar" (.ics). |
| `/staff` | Teachers & front desk | Daily rosters with check-in, no-show, late or no-fee cancellation, waitlist promotion, guest reservations, a late-cancel fee queue with waivers, room/equipment inventory (mats, bolsters, singing bowls…), clock in/out and weekly hours, and policy settings (late-cancel window and fee, auto-promote). |

**Booking takes two taps:** tap a class, then tap **Reserve my spot**. Times use the French 24-hour format (8h30, 19h45).

## Languages

French (default) and English, switchable with the FR / EN toggle in the header of both apps; the choice is remembered per device. All strings live in `lib/i18n.tsx` — add or edit a key in both the `fr` and `en` dictionaries. Class names stay as the studio writes them.

## Timetable

Configured in `lib/seed.ts` (`WEEK`):

| Day | Class | Time | Length |
|-----|-------|------|--------|
| Monday | Yoga anti stress | 19:30 | 1h30 |
| Tuesday | Yoga pour le dos | 19:30 | 1h30 |
| Wednesday | Yoga pour l'équilibre hormonal (Rania Sam) | 08:30 | 2h |
| Wednesday | Yoga débutant + | 19:30 | 1h30 |
| Thursday | Yoga pour l'équilibre hormonal (Rania Sam) | 08:30 | 2h |
| Thursday | Yoga santé colonne vertébrale | 19:30 | 1h30 |
| Friday | Yoga pour l'équilibre hormonal (Rania Sam) | 08:30 | 2h |
| Friday | Yoga restoratif | 19:30 | 1h30 |
| Saturday | Yoga air | 09:00 | 1h |
| Sunday | Yoga air | 10:00 | 1h |

Capacity: 10 per class in the main studio, 4 for yoga air (4 hammocks). Booking policy: cancel at least 2h
before a class (24h before an event); no fee, but staff can exclude a client after an unannounced absence.
The price list is shown in the client profile, and the next full moon (calculated, `lib/moon.ts`) is
shown on the schedule with a WhatsApp booking link for the monthly full-moon event.

Still to confirm: teachers for the non-hormonal classes ("New Moon Team" for now).

Reservations / WhatsApp: 56 775 096.

## Design

- Logo: the studio's own crescent-moon mark (`public/logo.png`), cleaned from the Instagram profile picture.
- Palette: warm neutrals with the logo's blush, peach and mauve. Tokens live in `app/globals.css`.
- Type: Cormorant Garamond (display) + Jost (UI).
- Calm motion: bottom sheets slide up and cards rise in. All motion respects `prefers-reduced-motion`.
- Installable PWA manifest using the studio logo.

## Accounts & data

Two modes, picked automatically:

- **Demo** (no environment variables): sample data stored on each device, with a "Mode démo" banner.
- **Live** (Supabase keys set in Vercel): clients create an account with an emailed 6-digit code (Google
  sign-in optional). They give their name, WhatsApp number and consent once. Bookings, waitlists and check-ins
  are saved in the owner's Supabase database. The capacity, late-cancel and waitlist rules run inside the
  database (`supabase/migrations/0001_studio.sql`), so a class can never be overbooked.

The staff portal is limited to accounts with the teacher, front desk or owner role. The owner manages
everything from `/staff`. **Membres** lists every client with a WhatsApp link and an Excel export, and
**Équipe** lets her give or remove staff access by email.

- **Going live (developer):** [`docs/SETUP.md`](docs/SETUP.md)
- **Owner's guide (French):** [`docs/GUIDE-PROPRIETAIRE.md`](docs/GUIDE-PROPRIETAIRE.md)

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Deploy to Vercel

Import this repository at https://vercel.com/new. Vercel detects Next.js automatically. Without environment variables the site runs in demo mode; add the two Supabase variables from `.env.example` to go live (see `docs/SETUP.md`).
