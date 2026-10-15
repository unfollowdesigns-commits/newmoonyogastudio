// Writes clients/<id>/database.sql from clients/<id>/studio.ts.
// Usage: npm run client:sql <id>
// Run it in the studio's Supabase SQL Editor after supabase/schema.sql.
import { writeFileSync } from "node:fs";
import type { StudioConfig } from "../clients/types";

const id = process.argv[2];
if (!id) {
  console.error("Usage: npm run client:sql <id>   (e.g. newmoon)");
  process.exit(1);
}
const studio: StudioConfig = (await import(`../clients/${id}/studio.ts`)).default;

const q = (v: string | number | boolean) => (typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : String(v));
const rows = (r: (string | number | boolean)[][]) => r.map((x) => `  (${x.map(q).join(", ")})`).join(",\n");
const r = studio.rules;

const sql = `-- ${studio.name} — studio data. Generated from clients/${id}/studio.ts by \`npm run client:sql ${id}\`.
-- Run after supabase/schema.sql. Safe to re-run: existing rows (and rules the owner changed in the app) are kept.

insert into public.settings (id, late_cancel_hours, late_cancel_fee, auto_promote, booking_cutoff_hours)
values (1, ${r.lateCancelHours}, ${r.lateCancelFee}, ${r.autoPromote}, ${r.bookingCutoffHours})
on conflict (id) do nothing;
update public.settings set timezone = ${q(studio.timezone)} where id = 1;

insert into public.teachers (id, name, tone, sort) values
${rows(studio.teachers.map((t, i) => [t.id, t.name, t.tone, i + 1]))}
on conflict (id) do nothing;

insert into public.rooms (id, capacity, cols, unit) values
${rows(studio.rooms.map((x) => [x.id, x.capacity, x.cols, x.unit]))}
on conflict (id) do nothing;

insert into public.weekly_slots (id, weekday, start_time, title, style, level, teacher_id, room_id, duration_min, desc_key) values
${rows(studio.timetable.map((c, i) => [i + 1, c.day, c.time, c.title, c.style, c.level, c.teacher, c.room, c.minutes, c.desc]))}
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('public.weekly_slots', 'id'), greatest((select max(id) from public.weekly_slots), 1));

insert into public.inventory (id, room_id, name, total, in_repair, minimum) values
${rows(studio.inventory.map((x) => [x.id, x.room, x.name, x.total, 0, x.minimum]))}
on conflict (id) do nothing;

select public.ensure_sessions(14);
`;

writeFileSync(`clients/${id}/database.sql`, sql);
console.log(`✓ clients/${id}/database.sql`);
