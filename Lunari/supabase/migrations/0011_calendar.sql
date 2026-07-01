-- ============================================================
-- CALENDAR
-- ============================================================

create table public.workspace_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  -- recurrence: null = one-time; otherwise repeat unit
  recurrence text check (recurrence in ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_end_date date,
  -- optional: post a message to this channel when event is created
  channel_id uuid references public.channels(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index workspace_events_workspace_id_idx on public.workspace_events (workspace_id, start_at);

-- Which workspace members are attending this event.
create table public.event_attendees (
  event_id uuid not null references public.workspace_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (event_id, user_id)
);

-- ============================================================
-- RLS
-- ============================================================

alter table public.workspace_events enable row level security;
alter table public.event_attendees enable row level security;

create policy "events_select"
  on public.workspace_events for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "events_insert"
  on public.workspace_events for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "events_update"
  on public.workspace_events for update to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "events_delete"
  on public.workspace_events for delete to authenticated
  using (created_by = auth.uid());

create policy "event_attendees_select"
  on public.event_attendees for select to authenticated
  using (exists (
    select 1 from public.workspace_events e
    where e.id = event_id and public.is_workspace_member(e.workspace_id)
  ));

create policy "event_attendees_all"
  on public.event_attendees for all to authenticated
  using (exists (
    select 1 from public.workspace_events e
    where e.id = event_id and public.is_workspace_member(e.workspace_id)
  ));

-- ============================================================
-- GRANTS
-- ============================================================

grant select, insert, update, delete on public.workspace_events to authenticated;
grant select, insert, delete on public.event_attendees to authenticated;
