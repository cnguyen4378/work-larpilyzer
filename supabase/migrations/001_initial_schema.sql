-- =============================================================================
-- 001_initial_schema.sql
-- Larpilyzer: time-based over/under betting app
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";  -- may not be available on all plans

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists users (
  id             uuid        primary key default gen_random_uuid(),
  username       text        not null unique,
  invite_token   text        unique,          -- token the user arrived with (audit trail)
  created_at     timestamptz not null default now()
);

create table if not exists invite_links (
  id             uuid        primary key default gen_random_uuid(),
  token          text        not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by     uuid        not null references users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz,                 -- null = never expires
  used_count     int         not null default 0
);

create table if not exists lines (
  id                uuid        primary key default gen_random_uuid(),
  title             text        not null,
  description       text,
  over_under_value  numeric     not null,
  timer_duration_ms bigint      not null,
  created_by        uuid        not null references users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  closes_at         timestamptz not null,
  status            text        not null default 'open'
                                check (status in ('open', 'closed', 'resolved')),
  resolved_outcome  text        check (resolved_outcome in ('over', 'under')),
  resolved_by       uuid        references users(id) on delete set null,
  resolved_at       timestamptz,

  -- a line cannot have an outcome without being resolved
  constraint resolved_fields_consistent check (
    (status = 'resolved') = (resolved_outcome is not null)
  )
);

create table if not exists bets (
  id          uuid        primary key default gen_random_uuid(),
  line_id     uuid        not null references lines(id) on delete cascade,
  user_id     uuid        not null references users(id) on delete cascade,
  side        text        not null check (side in ('over', 'under')),
  placed_at   timestamptz not null default now(),

  unique (line_id, user_id)    -- one bet per user per line
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table users        enable row level security;
alter table invite_links enable row level security;
alter table lines        enable row level security;
alter table bets         enable row level security;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists bets_line_id_idx        on bets(line_id);
create index if not exists bets_user_id_idx        on bets(user_id);
create index if not exists lines_status_idx        on lines(status);
create index if not exists lines_closes_at_idx     on lines(closes_at);
create index if not exists invite_links_token_idx  on invite_links(token);

-- ---------------------------------------------------------------------------
-- Function: refresh_line_statuses()
-- Closes any 'open' lines whose closes_at has passed.
-- Call this from pg_cron, or from the application on each page load.
-- ---------------------------------------------------------------------------
create or replace function refresh_line_statuses()
returns void
language sql
security definer
set search_path = public
as $$
  update lines
  set    status = 'closed'
  where  status = 'open'
    and  closes_at <= now();
$$;

-- ---------------------------------------------------------------------------
-- Optional: pg_cron job to run refresh every minute
-- Wrapped in a DO block so the migration succeeds even if pg_cron is absent.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    perform cron.schedule(
      'refresh-line-statuses',   -- job name (idempotent)
      '* * * * *',               -- every minute
      'select refresh_line_statuses()'
    );
  end if;
exception when others then
  -- pg_cron installed but cron.schedule unavailable — skip silently
  null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function: join_via_invite(p_token, p_username)
-- Atomically validates an invite token and creates a new user.
-- Returns the created user row.
-- Raises exceptions for invalid/expired tokens or duplicate usernames.
-- ---------------------------------------------------------------------------
create or replace function join_via_invite(
  p_token    text,
  p_username text
)
returns users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link  invite_links;
  v_user  users;
begin
  -- 1. Lock and fetch the invite link
  select * into v_link
  from   invite_links
  where  token = p_token
  for update;

  if not found then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;

  -- 2. Check expiry
  if v_link.expires_at is not null and v_link.expires_at < now() then
    raise exception 'invite_expired' using errcode = 'P0002';
  end if;

  -- 3. Create the user (unique constraint on username will raise on collision)
  insert into users (username, invite_token)
  values (p_username, p_token)
  returning * into v_user;

  -- 4. Increment used_count
  update invite_links
  set    used_count = used_count + 1
  where  id = v_link.id;

  return v_user;
end;
$$;
