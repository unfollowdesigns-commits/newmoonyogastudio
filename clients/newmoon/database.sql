-- New Moon Yoga Studio — studio data. Generated from clients/newmoon/studio.ts by `npm run client:sql newmoon`.
-- Run after supabase/schema.sql. Safe to re-run: existing rows (and rules the owner changed in the app) are kept.

insert into public.settings (id, late_cancel_hours, late_cancel_fee, auto_promote, booking_cutoff_hours)
values (1, 2, 0, true, 8)
on conflict (id) do nothing;
update public.settings set timezone = 'Africa/Tunis' where id = 1;

insert into public.teachers (id, name, tone, sort) values
  ('rania', 'Rania Sam', '#ead3c6', 1),
  ('team', 'New Moon Team', '#e4dbd8', 2)
on conflict (id) do nothing;

insert into public.rooms (id, capacity, cols, unit) values
  ('studio', 10, 5, 'mat'),
  ('aerial', 4, 4, 'hammock')
on conflict (id) do nothing;

insert into public.weekly_slots (id, weekday, start_time, title, style, level, teacher_id, room_id, duration_min, desc_key) values
  (1, 1, '19:30', 'Yoga anti stress', 'Anti-stress', 'All Levels', 'team', 'studio', 90, 'stress'),
  (2, 2, '19:30', 'Yoga pour le dos', 'Back care', 'All Levels', 'team', 'studio', 90, 'dos'),
  (3, 3, '08:30', 'Yoga pour l''équilibre hormonal', 'Women''s yoga', 'All Levels', 'rania', 'studio', 120, 'hormonal'),
  (4, 3, '19:30', 'Yoga débutant +', 'Beginner+', 'Beginner', 'team', 'studio', 90, 'debutant'),
  (5, 4, '08:30', 'Yoga pour l''équilibre hormonal', 'Women''s yoga', 'All Levels', 'rania', 'studio', 120, 'hormonal'),
  (6, 4, '19:30', 'Yoga santé colonne vertébrale', 'Back care', 'All Levels', 'team', 'studio', 90, 'colonne'),
  (7, 5, '08:30', 'Yoga pour l''équilibre hormonal', 'Women''s yoga', 'All Levels', 'rania', 'studio', 120, 'hormonal'),
  (8, 5, '19:30', 'Yoga restoratif', 'Restorative', 'All Levels', 'team', 'studio', 90, 'restoratif'),
  (9, 6, '09:00', 'Yoga air', 'Aerial', 'All Levels', 'team', 'aerial', 60, 'air'),
  (10, 0, '10:00', 'Yoga air', 'Aerial', 'All Levels', 'team', 'aerial', 60, 'air')
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('public.weekly_slots', 'id'), greatest((select max(id) from public.weekly_slots), 1));

insert into public.inventory (id, room_id, name, total, in_repair, minimum) values
  ('studio-mats', 'studio', 'Yoga mats', 12, 0, 10),
  ('studio-blocks', 'studio', 'Cork blocks', 20, 0, 20),
  ('studio-straps', 'studio', 'Straps', 10, 0, 10),
  ('studio-bolsters', 'studio', 'Bolsters', 10, 0, 10),
  ('studio-blankets', 'studio', 'Blankets', 12, 0, 10),
  ('studio-bowls', 'studio', 'Singing bowls', 3, 0, 2),
  ('aerial-hammocks', 'aerial', 'Aerial hammocks', 4, 0, 4),
  ('aerial-rigging', 'aerial', 'Rigging sets (carabiners, daisy chains)', 4, 0, 4),
  ('aerial-crash', 'aerial', 'Crash mats', 4, 0, 4)
on conflict (id) do nothing;

select public.ensure_sessions(14);
