-- Studio booking app — database setup, shared by every studio.
-- Run once in the studio's Supabase → SQL Editor, then run clients/<id>/database.sql
-- (the studio's own timetable, rooms and rules). Both are safe to re-run.
--
-- Data map (where everything lands):
--   profiles     one row per person who signed up (name, WhatsApp, email, role)
--   sessions     every dated class (generated from weekly_slots, 14 days ahead)
--   bookings     who booked which class + status (booked / checked-in / no-show / cancelled / late-cancel)
--   waitlist     who is waiting for a full class, in order
--   weekly_slots the timetable (edit here to change the planning)
--   inventory, shifts, activity, settings — staff tools
--
-- All business rules (capacity, late cancel, waitlist promotion) live in the
-- functions below, so the app can't overbook even with two taps at once.

-- ───────────────────────── tables ─────────────────────────

create table if not exists public.teachers (
  id text primary key,
  name text not null,
  tone text not null default '#e4dbd8',
  sort int not null default 0
);

create table if not exists public.rooms (
  id text primary key,
  capacity int not null check (capacity > 0),
  cols int not null default 4,
  unit text not null default 'mat' check (unit in ('mat', 'hammock'))
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  role text not null default 'client' check (role in ('client', 'teacher', 'desk', 'owner')),
  teacher_id text references public.teachers (id) on delete set null,
  consent_at timestamptz,
  lang text not null default 'fr',
  created_at timestamptz not null default now()
);
-- studio policy: an unannounced absence can mean exclusion from bookings
alter table public.profiles add column if not exists blocked boolean not null default false;

create table if not exists public.staff_invites (
  email text primary key,
  role text not null check (role in ('client', 'teacher', 'desk', 'owner')),
  teacher_id text references public.teachers (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_slots (
  id serial primary key,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  title text not null,
  style text not null,
  level text not null default 'All Levels',
  teacher_id text not null references public.teachers (id),
  room_id text not null references public.rooms (id),
  duration_min int not null default 60,
  capacity int, -- null = room capacity
  desc_key text not null default '',
  active boolean not null default true
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  slot_id int references public.weekly_slots (id) on delete set null,
  title text not null,
  style text not null,
  level text not null,
  teacher_id text not null references public.teachers (id),
  room_id text not null references public.rooms (id),
  starts_at timestamptz not null,
  duration_min int not null,
  capacity int not null check (capacity > 0),
  desc_key text not null default '',
  cancelled boolean not null default false,
  unique (slot_id, starts_at)
);
create index if not exists sessions_starts_at on public.sessions (starts_at);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  guest_name text,
  guest_of text,
  status text not null default 'booked' check (status in ('booked', 'checked-in', 'no-show', 'cancelled', 'late-cancel')),
  fee_waived boolean not null default false,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz -- user_id is null for guests and for deleted accounts (kept as anonymous history)
);
alter table public.bookings drop constraint if exists bookings_check;
create index if not exists bookings_session on public.bookings (session_id);
create index if not exists bookings_user on public.bookings (user_id);
-- one active booking per person per class
create unique index if not exists bookings_one_active
  on public.bookings (session_id, user_id)
  where user_id is not null and status in ('booked', 'checked-in', 'no-show');

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  late_cancel_hours int not null default 2,
  late_cancel_fee int not null default 0,
  auto_promote boolean not null default true
);
-- studio rule: bookings close 8 hours before a class
alter table public.settings add column if not exists booking_cutoff_hours int not null default 8;
-- the studio's timezone; classes are generated in local time
alter table public.settings add column if not exists timezone text not null default 'Africa/Tunis';

create table if not exists public.inventory (
  id text primary key,
  room_id text not null references public.rooms (id),
  name text not null,
  total int not null default 0 check (total >= 0),
  in_repair int not null default 0 check (in_repair >= 0 and in_repair <= total),
  minimum int not null default 0
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  start_at timestamptz not null default now(),
  end_at timestamptz
);

create table if not exists public.activity (
  id bigserial primary key,
  at timestamptz not null default now(),
  key text not null,
  vars jsonb not null default '{}'::jsonb
);

-- ───────────────────────── helpers ─────────────────────────

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'anon')
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('teacher', 'desk', 'owner')
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'owner'
$$;

create or replace function public.person_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select trim(first_name || ' ' || last_name) from profiles where id = p_user
$$;

create or replace function public.res(p_ok boolean, p_message text, p_vars jsonb default '{}'::jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object('ok', p_ok, 'message', p_message, 'vars', p_vars)
$$;

create or replace function public.log_activity(p_key text, p_vars jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = public as $$
  insert into activity (key, vars) values (p_key, p_vars);
  delete from activity where id in (select id from activity order by at desc offset 200);
$$;

-- new sign-up → profile row (+ staff role if the owner invited this email)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv staff_invites;
begin
  select * into inv from staff_invites where lower(email) = lower(new.email);
  insert into profiles (id, email, first_name, last_name, role, teacher_id)
  values (
    new.id,
    new.email,
    coalesce(split_part(new.raw_user_meta_data ->> 'full_name', ' ', 1), ''),
    coalesce(nullif(substr(new.raw_user_meta_data ->> 'full_name', length(split_part(new.raw_user_meta_data ->> 'full_name', ' ', 1)) + 2), ''), ''),
    coalesce(inv.role, 'client'),
    inv.teacher_id
  )
  on conflict (id) do nothing;
  if inv.email is not null then delete from staff_invites where email = inv.email; end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── schedule ─────────────────────────

-- creates dated classes for the next p_days days from the weekly timetable (idempotent)
create or replace function public.ensure_sessions(p_days int default 14) returns int
language plpgsql security definer set search_path = public as $$
declare n int; tz text := coalesce((select timezone from settings where id = 1), 'UTC');
begin
  insert into sessions (slot_id, title, style, level, teacher_id, room_id, starts_at, duration_min, capacity, desc_key)
  select w.id, w.title, w.style, w.level, w.teacher_id, w.room_id,
         ((d::date + w.start_time) at time zone tz),
         w.duration_min, coalesce(w.capacity, r.capacity), w.desc_key
  from weekly_slots w
  join rooms r on r.id = w.room_id
  cross join generate_series((now() at time zone tz)::date,
                             (now() at time zone tz)::date + least(greatest(p_days, 1), 31), interval '1 day') d
  where w.active and extract(dow from d) = w.weekday
  on conflict (slot_id, starts_at) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- public counts (no names) so everyone sees spots left
create or replace function public.session_stats(p_from timestamptz, p_to timestamptz)
returns table (session_id uuid, booked int, waiting int, my_position int)
language sql stable security definer set search_path = public as $$
  select s.id,
    (select count(*)::int from bookings b where b.session_id = s.id and b.status in ('booked', 'checked-in', 'no-show')),
    (select count(*)::int from waitlist w where w.session_id = s.id),
    (select pos::int from (
        select w.user_id, row_number() over (order by w.created_at, w.id) pos
        from waitlist w where w.session_id = s.id) q
     where q.user_id = auth.uid())
  from sessions s
  where s.starts_at >= p_from and s.starts_at < p_to
$$;

create or replace function public.active_count(p_session uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from bookings where session_id = p_session and status in ('booked', 'checked-in', 'no-show')
$$;

-- moves the first person on the waitlist into the class if there's room
create or replace function public.promote_next(p_session uuid) returns text
language plpgsql security definer set search_path = public as $$
declare s sessions; w waitlist;
begin
  select * into s from sessions where id = p_session for update;
  if public.active_count(p_session) >= s.capacity then return null; end if;
  select * into w from waitlist where session_id = p_session order by created_at, id limit 1 for update skip locked;
  if w.id is null then return null; end if;
  delete from waitlist where id = w.id;
  insert into bookings (session_id, user_id) values (p_session, w.user_id)
  on conflict do nothing;
  return public.person_name(w.user_id);
end $$;

-- ───────────────────────── client actions ─────────────────────────

create or replace function public.book_class(p_session uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; uid uuid := auth.uid();
begin
  if uid is null then return res(false, 'msg.loginRequired'); end if;
  if not exists (select 1 from profiles where id = uid and first_name <> '' and phone <> '') then
    return res(false, 'msg.profileRequired');
  end if;
  if exists (select 1 from profiles where id = uid and blocked) then return res(false, 'msg.blocked'); end if;
  select * into s from sessions where id = p_session for update; -- serialises bookings for this class
  if s.id is null or s.cancelled then return res(false, 'msg.noBooking'); end if;
  if s.starts_at <= now() then return res(false, 'msg.started'); end if;
  if s.starts_at - now() < make_interval(hours => (select booking_cutoff_hours from settings where id = 1)) then
    return res(false, 'msg.bookingClosed', jsonb_build_object('h', (select booking_cutoff_hours from settings where id = 1)));
  end if;
  if exists (select 1 from bookings where session_id = p_session and user_id = uid and status in ('booked', 'checked-in', 'no-show')) then
    return res(false, 'msg.alreadyBooked');
  end if;
  if public.active_count(p_session) >= s.capacity then return res(false, 'msg.justFull'); end if;
  delete from waitlist where session_id = p_session and user_id = uid;
  insert into bookings (session_id, user_id) values (p_session, uid);
  perform log_activity('log.booked', jsonb_build_object('name', person_name(uid)));
  return res(true, 'msg.booked');
end $$;

create or replace function public.cancel_booking(p_session uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; b bookings; st settings; uid uuid := auth.uid(); late boolean;
begin
  select * into s from sessions where id = p_session for update;
  select * into b from bookings where session_id = p_session and user_id = uid and status = 'booked' for update;
  if b.id is null then return res(false, 'msg.noBooking'); end if;
  select * into st from settings where id = 1;
  late := s.starts_at - now() < make_interval(hours => st.late_cancel_hours);
  update bookings set status = case when late then 'late-cancel' else 'cancelled' end, cancelled_at = now() where id = b.id;
  if st.auto_promote then perform promote_next(p_session); end if;
  perform log_activity('log.cancelled', jsonb_build_object('name', person_name(uid)));
  return res(true, case when late then 'msg.cancelLate' else 'msg.cancelFree' end, jsonb_build_object('fee', st.late_cancel_fee));
end $$;

create or replace function public.join_waitlist(p_session uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; uid uuid := auth.uid(); pos int;
begin
  if uid is null then return res(false, 'msg.loginRequired'); end if;
  if not exists (select 1 from profiles where id = uid and first_name <> '' and phone <> '') then
    return res(false, 'msg.profileRequired');
  end if;
  if exists (select 1 from profiles where id = uid and blocked) then return res(false, 'msg.blocked'); end if;
  select * into s from sessions where id = p_session for update;
  if s.id is null or s.starts_at <= now() then return res(false, 'msg.started'); end if;
  if s.starts_at - now() < make_interval(hours => (select booking_cutoff_hours from settings where id = 1)) then
    return res(false, 'msg.bookingClosed', jsonb_build_object('h', (select booking_cutoff_hours from settings where id = 1)));
  end if;
  if exists (select 1 from bookings where session_id = p_session and user_id = uid and status in ('booked', 'checked-in', 'no-show')) then
    return res(false, 'msg.alreadyBooked');
  end if;
  if public.active_count(p_session) < s.capacity then return book_class(p_session); end if;
  if exists (select 1 from waitlist where session_id = p_session and user_id = uid) then return res(false, 'msg.alreadyWaiting'); end if;
  insert into waitlist (session_id, user_id) values (p_session, uid);
  select count(*) into pos from waitlist where session_id = p_session;
  perform log_activity('log.waitlist', jsonb_build_object('name', person_name(uid)));
  return res(true, 'msg.waitJoined', jsonb_build_object('n', pos));
end $$;

create or replace function public.leave_waitlist(p_session uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  delete from waitlist where session_id = p_session and user_id = auth.uid();
  return res(true, 'msg.waitLeft');
end $$;

-- ───────────────────────── staff actions ─────────────────────────

create or replace function public.staff_set_status(p_booking uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b bookings; nm text;
begin
  if not is_staff() then return res(false, 'msg.forbidden'); end if;
  if p_status not in ('booked', 'checked-in', 'no-show') then return res(false, 'msg.forbidden'); end if;
  update bookings set status = p_status where id = p_booking and status in ('booked', 'checked-in', 'no-show') returning * into b;
  if b.id is null then return res(false, 'msg.noBooking'); end if;
  nm := coalesce(b.guest_name, person_name(b.user_id));
  return res(true, case p_status when 'checked-in' then 'msg.checkedIn' when 'no-show' then 'msg.noShow' else 'msg.restored' end,
             jsonb_build_object('name', nm));
end $$;

create or replace function public.staff_cancel(p_booking uuid, p_late boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b bookings; promoted text; nm text;
begin
  if not is_staff() then return res(false, 'msg.forbidden'); end if;
  select * into b from bookings where id = p_booking;
  perform 1 from sessions where id = b.session_id for update;
  update bookings set status = case when p_late then 'late-cancel' else 'cancelled' end, cancelled_at = now()
  where id = p_booking and status in ('booked', 'checked-in', 'no-show') returning * into b;
  if b.id is null then return res(false, 'msg.noBooking'); end if;
  if (select auto_promote from settings where id = 1) then promoted := promote_next(b.session_id); end if;
  nm := coalesce(b.guest_name, person_name(b.user_id));
  perform log_activity('log.staffCancel');
  return res(true, case when p_late then 'msg.cancelledLate' else 'msg.cancelled' end,
             jsonb_build_object('name', nm, 'promoted', coalesce(promoted, '')));
end $$;

create or replace function public.staff_promote(p_wait uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w waitlist; s sessions;
begin
  if not is_staff() then return res(false, 'msg.forbidden'); end if;
  select * into w from waitlist where id = p_wait;
  if w.id is null then return res(false, 'msg.noBooking'); end if;
  select * into s from sessions where id = w.session_id for update;
  if active_count(s.id) >= s.capacity then return res(false, 'msg.noSpots'); end if;
  delete from waitlist where id = w.id;
  insert into bookings (session_id, user_id) values (w.session_id, w.user_id) on conflict do nothing;
  perform log_activity('log.promoted');
  return res(true, 'msg.promoted', jsonb_build_object('name', person_name(w.user_id)));
end $$;

create or replace function public.staff_remove_wait(p_wait uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then return res(false, 'msg.forbidden'); end if;
  delete from waitlist where id = p_wait;
  return res(true, 'msg.removedWait');
end $$;

create or replace function public.staff_add_guest(p_session uuid, p_name text, p_guest_of text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  if not is_staff() then return res(false, 'msg.forbidden'); end if;
  if coalesce(trim(p_name), '') = '' then return res(false, 'msg.guestName'); end if;
  select * into s from sessions where id = p_session for update;
  if active_count(p_session) >= s.capacity then return res(false, 'msg.classFull'); end if;
  insert into bookings (session_id, guest_name, guest_of) values (p_session, trim(p_name), nullif(trim(p_guest_of), ''));
  perform log_activity('log.guest');
  return res(true, 'msg.guestAdded', jsonb_build_object('name', trim(p_name)));
end $$;

create or replace function public.staff_waive_fee(p_booking uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v boolean;
begin
  if not is_staff() then return res(false, 'msg.forbidden'); end if;
  update bookings set fee_waived = not fee_waived where id = p_booking returning fee_waived into v;
  return res(true, case when v then 'msg.feeWaived' else 'msg.feeBack' end);
end $$;

create or replace function public.staff_adjust_inventory(p_item text, p_field text, p_delta int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare it inventory;
begin
  if not is_staff() then return res(false, 'msg.forbidden'); end if;
  select * into it from inventory where id = p_item for update;
  if p_field = 'total' then
    if it.total + p_delta < greatest(it.in_repair, 0) then return res(false, 'msg.badCount'); end if;
    update inventory set total = total + p_delta where id = p_item;
  elsif p_field = 'inRepair' then
    if it.in_repair + p_delta < 0 or it.in_repair + p_delta > it.total then return res(false, 'msg.badCount'); end if;
    update inventory set in_repair = in_repair + p_delta where id = p_item;
  else
    return res(false, 'msg.badCount');
  end if;
  return res(true, '');
end $$;

create or replace function public.staff_clock_toggle() returns jsonb
language plpgsql security definer set search_path = public as $$
declare sh shifts;
begin
  if not is_staff() then return res(false, 'msg.forbidden'); end if;
  select * into sh from shifts where staff_id = auth.uid() and end_at is null order by start_at desc limit 1;
  if sh.id is not null then
    update shifts set end_at = now() where id = sh.id;
    return res(true, 'msg.clockOut');
  end if;
  insert into shifts (staff_id) values (auth.uid());
  return res(true, 'msg.clockIn');
end $$;

drop function if exists public.staff_members();
create or replace function public.staff_members()
returns table (id uuid, first_name text, last_name text, phone text, email text, role text, created_at timestamptz,
               attended int, no_shows int, late_cancels int, upcoming int, blocked boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then return; end if;
  return query
  select p.id, p.first_name, p.last_name, p.phone, p.email, p.role, p.created_at,
    count(*) filter (where b.status = 'checked-in')::int,
    count(*) filter (where b.status = 'no-show')::int,
    count(*) filter (where b.status = 'late-cancel')::int,
    count(*) filter (where b.status = 'booked' and s.starts_at > now())::int,
    p.blocked
  from profiles p
  left join bookings b on b.user_id = p.id
  left join sessions s on s.id = b.session_id
  group by p.id
  order by p.created_at desc;
end $$;

-- exclude / re-admit a client (cancels their upcoming bookings and waitlist spots when excluding)
create or replace function public.staff_set_blocked(p_user uuid, p_blocked boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare nm text; sid uuid;
begin
  if not is_staff() then return res(false, 'msg.forbidden'); end if;
  if exists (select 1 from profiles where id = p_user and role <> 'client') then return res(false, 'msg.forbidden'); end if;
  update profiles set blocked = p_blocked where id = p_user returning trim(first_name || ' ' || last_name) into nm;
  if p_blocked then
    delete from waitlist where user_id = p_user;
    for sid in
      update bookings b set status = 'cancelled', cancelled_at = now()
      from sessions s
      where b.session_id = s.id and b.user_id = p_user and b.status = 'booked' and s.starts_at > now()
      returning b.session_id
    loop
      if (select auto_promote from settings where id = 1) then perform promote_next(sid); end if;
    end loop;
  end if;
  perform log_activity(case when p_blocked then 'log.blocked' else 'log.unblocked' end, jsonb_build_object('name', nm));
  return res(true, case when p_blocked then 'msg.blocked.done' else 'msg.unblocked' end, jsonb_build_object('name', nm));
end $$;

-- ───────────────────────── owner actions ─────────────────────────

drop function if exists public.owner_update_settings(int, int, boolean);
create or replace function public.owner_update_settings(p_hours int, p_fee int, p_auto boolean, p_cutoff int) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then return res(false, 'msg.forbidden'); end if;
  update settings set late_cancel_hours = p_hours, late_cancel_fee = p_fee, auto_promote = p_auto,
    booking_cutoff_hours = greatest(p_cutoff, 0) where id = 1;
  return res(true, 'msg.saved');
end $$;

-- give someone a role by email; works before or after they sign up
create or replace function public.owner_set_role(p_email text, p_role text, p_teacher text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_owner() then return res(false, 'msg.forbidden'); end if;
  if p_role not in ('client', 'teacher', 'desk', 'owner') then return res(false, 'msg.forbidden'); end if;
  update profiles set role = p_role, teacher_id = p_teacher where lower(email) = lower(trim(p_email)) and id <> auth.uid();
  get diagnostics n = row_count;
  if n = 0 then
    insert into staff_invites (email, role, teacher_id) values (lower(trim(p_email)), p_role, p_teacher)
    on conflict (email) do update set role = excluded.role, teacher_id = excluded.teacher_id;
    return res(true, 'msg.invited', jsonb_build_object('email', trim(p_email)));
  end if;
  return res(true, 'msg.roleSet', jsonb_build_object('email', trim(p_email)));
end $$;

-- ───────────────────────── security (row level) ─────────────────────────

alter table public.teachers enable row level security;
alter table public.rooms enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_invites enable row level security;
alter table public.weekly_slots enable row level security;
alter table public.sessions enable row level security;
alter table public.bookings enable row level security;
alter table public.waitlist enable row level security;
alter table public.settings enable row level security;
alter table public.inventory enable row level security;
alter table public.shifts enable row level security;
alter table public.activity enable row level security;

do $$ begin
  -- public timetable
  drop policy if exists "read teachers" on public.teachers;
  create policy "read teachers" on public.teachers for select using (true);
  drop policy if exists "read rooms" on public.rooms;
  create policy "read rooms" on public.rooms for select using (true);
  drop policy if exists "read slots" on public.weekly_slots;
  create policy "read slots" on public.weekly_slots for select using (true);
  drop policy if exists "read sessions" on public.sessions;
  create policy "read sessions" on public.sessions for select using (true);
  drop policy if exists "read settings" on public.settings;
  create policy "read settings" on public.settings for select using (true);

  -- people: you see yourself, staff see everyone
  drop policy if exists "read profiles" on public.profiles;
  create policy "read profiles" on public.profiles for select using (id = auth.uid() or public.is_staff());
  drop policy if exists "update own profile" on public.profiles;
  create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

  drop policy if exists "read bookings" on public.bookings;
  create policy "read bookings" on public.bookings for select using (user_id = auth.uid() or public.is_staff());
  drop policy if exists "read waitlist" on public.waitlist;
  create policy "read waitlist" on public.waitlist for select using (user_id = auth.uid() or public.is_staff());

  drop policy if exists "staff inventory" on public.inventory;
  create policy "staff inventory" on public.inventory for select using (public.is_staff());
  drop policy if exists "staff shifts" on public.shifts;
  create policy "staff shifts" on public.shifts for select using (public.is_staff());
  drop policy if exists "staff activity" on public.activity;
  create policy "staff activity" on public.activity for select using (public.is_staff());
  drop policy if exists "owner invites" on public.staff_invites;
  create policy "owner invites" on public.staff_invites for select using (public.is_owner());

  -- the owner can edit the timetable directly (e.g. from the Supabase table editor)
  drop policy if exists "owner edits slots" on public.weekly_slots;
  create policy "owner edits slots" on public.weekly_slots for all using (public.is_owner()) with check (public.is_owner());
  drop policy if exists "owner edits sessions" on public.sessions;
  create policy "owner edits sessions" on public.sessions for update using (public.is_owner()) with check (public.is_owner());
end $$;

-- clients may only edit their own contact details, never their role
revoke update on public.profiles from anon, authenticated;
grant update (first_name, last_name, phone, consent_at, lang) on public.profiles to authenticated;

-- writes go through the functions above
revoke insert, update, delete on public.bookings, public.waitlist, public.inventory, public.shifts,
  public.activity, public.settings, public.staff_invites from anon, authenticated;

revoke execute on function public.promote_next(uuid), public.log_activity(text, jsonb), public.handle_new_user() from public, anon, authenticated;

-- visitors who aren't signed in can only read the timetable and spots left
revoke execute on function public.book_class(uuid), public.cancel_booking(uuid), public.join_waitlist(uuid), public.leave_waitlist(uuid),
  public.staff_set_status(uuid, text), public.staff_cancel(uuid, boolean), public.staff_promote(uuid), public.staff_remove_wait(uuid),
  public.staff_add_guest(uuid, text, text), public.staff_waive_fee(uuid), public.staff_adjust_inventory(text, text, integer),
  public.staff_clock_toggle(), public.staff_members(), public.staff_set_blocked(uuid, boolean),
  public.owner_update_settings(integer, integer, boolean, integer), public.owner_set_role(text, text, text),
  public.person_name(uuid), public.active_count(uuid)
from public, anon;
-- internal helpers, only used inside the functions above
revoke execute on function public.person_name(uuid), public.active_count(uuid) from authenticated;

-- live updates for the staff rosters
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.bookings; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.waitlist; exception when duplicate_object then null; end;
  end if;
end $$;
