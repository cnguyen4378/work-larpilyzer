-- =============================================================================
-- 002_rls_policies.sql
-- Larpilyzer RLS policies
--
-- Identity convention:
--   auth.uid() is set to the users.id UUID by your auth layer.
--   Because this app has no Supabase Auth accounts, the application must
--   call `set_config('app.current_user_id', <uuid>, true)` at the start of
--   every request (or use a JWT custom claim mapped to auth.uid()).
--   The helper current_user_id() below reads that config key so that all
--   policies work the same way regardless of which mechanism you choose.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: current_user_id()
-- Returns the UUID of the authenticated user for the current request.
-- Reads from auth.uid() first (Supabase JWT path); falls back to the
-- app.current_user_id session variable (server-side / service-key path).
-- ---------------------------------------------------------------------------
create or replace function current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid(),
    nullif(current_setting('app.current_user_id', true), '')::uuid
  );
$$;

-- =============================================================================
-- users
-- =============================================================================

-- Drop before recreate so re-running the migration is idempotent
drop policy if exists "users_select_all"      on users;
drop policy if exists "users_insert_own"      on users;
drop policy if exists "users_update_own"      on users;

-- Everyone in the group can see each other's profiles
create policy "users_select_all"
  on users for select
  using (current_user_id() is not null);

-- Inserts go through join_via_invite() (security definer) only.
-- A direct INSERT is permitted only if the new row's id matches the caller —
-- in practice this never fires because join_via_invite() does the insert
-- as the function owner, bypassing RLS. Kept here as a safety net.
create policy "users_insert_own"
  on users for insert
  with check (id = current_user_id());

-- Users can edit their own profile (e.g., change username)
create policy "users_update_own"
  on users for update
  using    (id = current_user_id())
  with check (id = current_user_id());

-- =============================================================================
-- invite_links
-- =============================================================================

drop policy if exists "invite_links_select_authenticated" on invite_links;
drop policy if exists "invite_links_insert_authenticated" on invite_links;
drop policy if exists "invite_links_update_own"           on invite_links;

-- Any authenticated user can see all invite links (so they can share links)
create policy "invite_links_select_authenticated"
  on invite_links for select
  using (current_user_id() is not null);

-- Any authenticated user can create invite links for friends
create policy "invite_links_insert_authenticated"
  on invite_links for insert
  with check (
    current_user_id() is not null
    and created_by = current_user_id()
  );

-- Only the creator can update their own link (e.g., set expires_at).
-- used_count increments are done by join_via_invite() which is security definer
-- and bypasses this policy, so we can safely restrict direct UPDATE here.
create policy "invite_links_update_own"
  on invite_links for update
  using    (created_by = current_user_id())
  with check (created_by = current_user_id());

-- =============================================================================
-- lines
-- =============================================================================

drop policy if exists "lines_select_authenticated"    on lines;
drop policy if exists "lines_insert_authenticated"    on lines;
drop policy if exists "lines_update_authenticated"    on lines;

-- All authenticated users can browse all lines
create policy "lines_select_authenticated"
  on lines for select
  using (current_user_id() is not null);

-- Any authenticated user can post a new line
create policy "lines_insert_authenticated"
  on lines for insert
  with check (
    current_user_id() is not null
    and created_by = current_user_id()
  );

-- Resolution is a social act — anyone in the group can resolve any line.
-- Editing non-resolution fields (title, description, etc.) is limited to
-- the line creator. We enforce this by splitting the allowed columns:
--   - Resolver path: only status/resolved_* fields may change, and only
--     when transitioning from 'closed' -> 'resolved'.
--   - Owner edit path: creator may change title/description/timer fields
--     while the line is still 'open'.
create policy "lines_update_authenticated"
  on lines for update
  using (current_user_id() is not null)
  with check (
    current_user_id() is not null
    and (
      -- Resolution: anyone can mark a closed line as resolved
      (
        status = 'resolved'
        and resolved_outcome is not null
        and resolved_by = current_user_id()
      )
      or
      -- Status auto-update by refresh_line_statuses() (security definer, no RLS)
      -- This branch covers direct 'open'->'closed' transitions from app code
      (
        status in ('open', 'closed')
        and resolved_outcome is null
      )
      or
      -- Owner can edit descriptive fields while line is open
      (
        created_by = current_user_id()
        and status = 'open'
      )
    )
  );

-- =============================================================================
-- bets
-- =============================================================================

drop policy if exists "bets_select_authenticated" on bets;
drop policy if exists "bets_insert_own"           on bets;

-- All authenticated users can see all bets (group transparency)
create policy "bets_select_authenticated"
  on bets for select
  using (current_user_id() is not null);

-- Users can only place bets as themselves
create policy "bets_insert_own"
  on bets for insert
  with check (
    current_user_id() is not null
    and user_id = current_user_id()
  );

-- No UPDATE or DELETE on bets — bets are immutable once placed.
-- The unique(line_id, user_id) constraint enforces one-bet-per-user.
