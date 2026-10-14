# New Moon Yoga Studio

A mobile-first, premium booking app for a boutique yoga studio. Built with Next.js 15 + Tailwind CSS 4. It deploys to Vercel with no configuration.

## Two interfaces

| Route    | For            | What it does |
|----------|----------------|--------------|
| `/`      | Clients        | 14-day calendar strip + month view, filters by style / instructor / level / room / time of day, live open-mat counts, optional mat picking on a room map, one-tap booking, waitlists, cancellation with a late-cancel warning, and "Add to calendar" (.ics). |
| `/staff` | Teachers & front desk | Daily rosters with check-in, no-show, mat move/swap, late or no-fee cancellation, waitlist promotion, guest reservations, a late-cancel fee queue with waivers, room/equipment inventory (mats, bolsters, singing bowls…), clock in/out and weekly hours, and policy settings (late-cancel window and fee, auto-promote). |

**Booking takes two taps:** tap a class, then tap **Reserve my mat**.

## Design

- Palette: warm sand and linen neutrals, muted sage, clay and rose accents. Tokens live in `app/globals.css`.
- Type: Cormorant Garamond (display) + Jost (UI).
- Calm motion: bottom sheets slide up and cards rise in. All motion respects `prefers-reduced-motion`.
- Installable PWA manifest with the crescent moon mark.

## Data (demo mode)

State lives in `lib/store.ts` and is persisted to `localStorage`. Tabs stay in sync, so you can open `/` and `/staff` side by side and watch a booking land on the roster. The sample schedule is generated from a weekly timetable in `lib/seed.ts`. You can reset it under **Staff → Policies**.

To go to production, swap the action functions in `lib/store.ts` for API calls backed by a database (e.g. Supabase/Postgres, using a transaction or row lock on booking so capacity can't be oversold), and add real auth for members and staff.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Deploy to Vercel

Import this repository at https://vercel.com/new. Vercel detects Next.js automatically, so you don't need any settings or environment variables.
