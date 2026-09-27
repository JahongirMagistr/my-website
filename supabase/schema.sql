-- Agricrowd.uz — Supabase (PostgreSQL) sxemasi.
-- Supabase → SQL Editor → shu faylni to'liq joylab, «Run» bosing. Qayta ishga tushirish xavfsiz.
--
-- Barcha jadvallarga faqat server (Netlify Function, service_role kaliti) orqali murojaat qilinadi:
-- RLS yoqilgan va ochiq siyosatlar yo'q, shuning uchun brauzerdan (anon kalit bilan) ma'lumotlarni o'qib/yozib bo'lmaydi.

create table if not exists public.agri_meta (
  id int primary key default 1 check (id = 1),
  version bigint not null default 0,
  settings jsonb,
  updated_at timestamptz default now()
);
insert into public.agri_meta (id) values (1) on conflict do nothing;

create table if not exists public.users (
  id text primary key,
  role text,                -- investor | farmer | admin
  name text,
  email text unique,
  phone text,
  salt text,
  pass_hash text,
  balance bigint default 0, -- so'm
  blocked boolean default false,
  verified boolean default false,
  rating numeric,
  lang text,
  farm jsonb,               -- xo'jalik ma'lumotlari (fermerlar uchun)
  bank jsonb,               -- bank rekvizitlari / karta
  docs jsonb,               -- pasport, JSHSHIR, manzil
  created_at timestamptz,
  last_login_at timestamptz
);

create table if not exists public.projects (
  id text primary key,
  farmer_id text references public.users(id),
  title text, crop text, region text, district text,
  area numeric, total_cost bigint, goal bigint, raised bigint default 0,
  purpose text, usage jsonb, plan text,
  expected_yield numeric, expected_price numeric, expected_revenue bigint,
  investor_share numeric, return_terms text, duration_months int, funding_deadline date,
  collateral text, insurance text, guarantee text, documents text,
  image text, summary text,
  status text,              -- pending | rejected | funding | funded | in_progress | harvest | completed | refunded
  admin_note text, featured boolean default false,
  contract_template jsonb, distribution jsonb, actual_revenue bigint,
  created_at timestamptz, submitted_at timestamptz, approved_at timestamptz, funded_at timestamptz,
  disbursed_at timestamptz, refunded_at timestamptz, completed_at timestamptz
);

create table if not exists public.investments (
  id text primary key,
  project_id text references public.projects(id),
  investor_id text references public.users(id),
  amount bigint, status text, payout bigint default 0,
  created_at timestamptz
);

create table if not exists public.monitoring_updates (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  author_id text, author_role text,
  title text, text text, stage text, images jsonb, video text,
  created_at timestamptz
);

create table if not exists public.contracts (
  id text primary key,
  number text,
  project_id text references public.projects(id),
  investor_id text references public.users(id),
  farmer_id text references public.users(id),
  amount bigint, share_percent numeric,
  status text,              -- awaiting | partial | signed | verified
  investor_file jsonb, farmer_file jsonb,
  admin_note text, created_at timestamptz, verified_at timestamptz
);

create table if not exists public.payments (
  id text primary key,
  user_id text references public.users(id),
  method text,              -- bank | payme | click | test
  amount bigint, status text,
  receipt jsonb, provider jsonb, provider_tx_id text,
  note text, admin_note text,
  created_at timestamptz, paid_at timestamptz
);

create table if not exists public.withdrawals (
  id text primary key,
  user_id text references public.users(id),
  amount bigint, status text, bank jsonb, admin_note text,
  created_at timestamptz, processed_at timestamptz
);

create table if not exists public.notifications (
  id text primary key,
  user_id text references public.users(id) on delete cascade,
  title text, body text, params jsonb, link text, read boolean default false,
  created_at timestamptz
);

create table if not exists public.transactions (
  id text primary key,
  user_id text, type text, amount bigint, project_id text, note text,
  created_at timestamptz
);

create table if not exists public.activity_logs (
  id text primary key,
  user_id text, action text, details text,
  created_at timestamptz
);

create table if not exists public.news (
  id text primary key,
  author_id text, title text, body text, image text, published boolean default false,
  created_at timestamptz, updated_at timestamptz
);

create table if not exists public.messages (
  id text primary key,
  user_id text, name text, email text, phone text, subject text, body text,
  status text, admin_note text, created_at timestamptz
);

create index if not exists projects_status_idx on public.projects(status);
create index if not exists investments_project_idx on public.investments(project_id);
create index if not exists investments_investor_idx on public.investments(investor_id);
create index if not exists contracts_project_idx on public.contracts(project_id);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists logs_created_idx on public.activity_logs(created_at desc);

-- RLS: faqat service_role (server) kira oladi
do $$
declare t text;
begin
  foreach t in array array['agri_meta','users','projects','investments','monitoring_updates','contracts','payments','withdrawals','notifications','transactions','activity_logs','news','messages'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Butun bazani bitta izchil holatda yuklash
create or replace function public.agri_load(log_limit int default 1000)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'version', m.version,
    'settings', m.settings,
    'users', coalesce((select jsonb_agg(to_jsonb(x)) from public.users x), '[]'),
    'projects', coalesce((select jsonb_agg(to_jsonb(x)) from public.projects x), '[]'),
    'investments', coalesce((select jsonb_agg(to_jsonb(x)) from public.investments x), '[]'),
    'monitoring_updates', coalesce((select jsonb_agg(to_jsonb(x)) from public.monitoring_updates x), '[]'),
    'contracts', coalesce((select jsonb_agg(to_jsonb(x)) from public.contracts x), '[]'),
    'payments', coalesce((select jsonb_agg(to_jsonb(x)) from public.payments x), '[]'),
    'withdrawals', coalesce((select jsonb_agg(to_jsonb(x)) from public.withdrawals x), '[]'),
    'notifications', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.notifications order by created_at desc limit 5000) x), '[]'),
    'transactions', coalesce((select jsonb_agg(to_jsonb(x)) from public.transactions x), '[]'),
    'activity_logs', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.activity_logs order by created_at desc limit log_limit) x), '[]'),
    'news', coalesce((select jsonb_agg(to_jsonb(x)) from public.news x), '[]'),
    'messages', coalesce((select jsonb_agg(to_jsonb(x)) from public.messages x), '[]')
  ) from public.agri_meta m where m.id = 1;
$$;

-- O'zgarishlarni bitta tranzaksiyada saqlash (optimistik blok: versiya mos kelmasa — false)
-- changes: { "<jadval>": { "upsert": [ {...qator} ], "delete": [ "id", ... ] } }
create or replace function public.agri_apply(expected_version bigint, changes jsonb, new_settings jsonb default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  cur bigint;
  t text;
  cols text;
  sets text;
  parents text[] := array['users','projects','investments','monitoring_updates','contracts','payments','withdrawals','notifications','transactions','activity_logs','news','messages'];
  i int;
begin
  select version into cur from public.agri_meta where id = 1 for update;
  if cur is distinct from expected_version then
    return false;
  end if;

  -- avval bolalar jadvallaridan o'chirish
  for i in reverse array_length(parents, 1) .. 1 loop
    t := parents[i];
    if jsonb_array_length(coalesce(changes -> t -> 'delete', '[]'::jsonb)) > 0 then
      execute format('delete from public.%I where id in (select jsonb_array_elements_text($1))', t)
        using changes -> t -> 'delete';
    end if;
  end loop;

  -- keyin ota jadvallardan boshlab qo'shish/yangilash
  foreach t in array parents loop
    if jsonb_array_length(coalesce(changes -> t -> 'upsert', '[]'::jsonb)) > 0 then
      select string_agg(format('%I', column_name), ', ' order by ordinal_position),
             string_agg(format('%I = excluded.%I', column_name, column_name), ', ' order by ordinal_position) filter (where column_name <> 'id')
        into cols, sets
        from information_schema.columns
       where table_schema = 'public' and table_name = t;
      execute format(
        'insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1) on conflict (id) do update set %s',
        t, cols, cols, t, sets
      ) using changes -> t -> 'upsert';
    end if;
  end loop;

  update public.agri_meta
     set version = version + 1,
         settings = coalesce(new_settings, settings),
         updated_at = now()
   where id = 1;
  return true;
end $$;

revoke all on function public.agri_load(int) from public, anon, authenticated;
revoke all on function public.agri_apply(bigint, jsonb, jsonb) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.agri_load(int) to service_role;
    grant execute on function public.agri_apply(bigint, jsonb, jsonb) to service_role;
  end if;
end $$;

-- Fayl saqlash (Supabase Storage): rasmlar — ochiq, hujjatlar (shartnomalar, cheklar) — yopiq
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
    insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;
  end if;
end $$;
