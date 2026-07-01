-- ============================================================
-- KANBAN BOARDS
-- ============================================================

-- Boards belong to a workspace. Private boards restrict access
-- to members listed in board_members.
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  is_private boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Explicit membership for private boards.
create table public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (board_id, user_id)
);

-- Columns (lists) within a board, ordered by `position`.
create table public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index board_columns_board_id_idx on public.board_columns (board_id, position);

-- Cards within a column, ordered by `position`.
create table public.board_cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.board_columns(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  due_date timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index board_cards_column_id_idx on public.board_cards (column_id, position);

-- Color labels on cards. Multiple labels per card are allowed.
create table public.card_labels (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.board_cards(id) on delete cascade,
  color text not null, -- e.g. 'red', 'green', 'blue', 'yellow', 'purple', 'orange'
  text text not null default ''
);

-- Assignees: workspace members assigned to a card.
create table public.card_assignees (
  card_id uuid not null references public.board_cards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (card_id, user_id)
);

-- Checklist items within a card, ordered by `position`.
create table public.card_checklist_items (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.board_cards(id) on delete cascade,
  text text not null,
  is_done boolean not null default false,
  position integer not null default 0
);

-- ============================================================
-- HELPERS
-- ============================================================

create or replace function public.is_board_accessible(_board_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.boards b
    join public.workspace_members wm on wm.workspace_id = b.workspace_id and wm.user_id = auth.uid()
    where b.id = _board_id and (
      b.is_private = false
      or exists (select 1 from public.board_members bm where bm.board_id = _board_id and bm.user_id = auth.uid())
    )
  );
$$ language sql security definer stable set search_path = public;

-- ============================================================
-- RLS
-- ============================================================

alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.board_columns enable row level security;
alter table public.board_cards enable row level security;
alter table public.card_labels enable row level security;
alter table public.card_assignees enable row level security;
alter table public.card_checklist_items enable row level security;

-- Boards: visible if workspace member AND (public board OR board member)
create policy "boards_select"
  on public.boards for select
  to authenticated
  using (public.is_board_accessible(id));

create policy "boards_insert"
  on public.boards for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "boards_update"
  on public.boards for update
  to authenticated
  using (public.is_board_accessible(id));

create policy "boards_delete"
  on public.boards for delete
  to authenticated
  using (created_by = auth.uid());

-- Board members
create policy "board_members_select"
  on public.board_members for select
  to authenticated
  using (public.is_board_accessible(board_id));

create policy "board_members_insert"
  on public.board_members for insert
  to authenticated
  with check (public.is_board_accessible(board_id));

create policy "board_members_delete"
  on public.board_members for delete
  to authenticated
  using (public.is_board_accessible(board_id));

-- Columns, cards, labels, assignees, checklist: inherit board access
create policy "board_columns_select"
  on public.board_columns for select to authenticated
  using (public.is_board_accessible(board_id));

create policy "board_columns_insert"
  on public.board_columns for insert to authenticated
  with check (public.is_board_accessible(board_id));

create policy "board_columns_update"
  on public.board_columns for update to authenticated
  using (public.is_board_accessible(board_id));

create policy "board_columns_delete"
  on public.board_columns for delete to authenticated
  using (public.is_board_accessible(board_id));

create policy "board_cards_select"
  on public.board_cards for select to authenticated
  using (exists (
    select 1 from public.board_columns bc where bc.id = column_id and public.is_board_accessible(bc.board_id)
  ));

create policy "board_cards_insert"
  on public.board_cards for insert to authenticated
  with check (exists (
    select 1 from public.board_columns bc where bc.id = column_id and public.is_board_accessible(bc.board_id)
  ));

create policy "board_cards_update"
  on public.board_cards for update to authenticated
  using (exists (
    select 1 from public.board_columns bc where bc.id = column_id and public.is_board_accessible(bc.board_id)
  ));

create policy "board_cards_delete"
  on public.board_cards for delete to authenticated
  using (exists (
    select 1 from public.board_columns bc where bc.id = column_id and public.is_board_accessible(bc.board_id)
  ));

create policy "card_labels_all"
  on public.card_labels for all to authenticated
  using (exists (
    select 1 from public.board_cards c
    join public.board_columns bc on bc.id = c.column_id
    where c.id = card_id and public.is_board_accessible(bc.board_id)
  ));

create policy "card_assignees_all"
  on public.card_assignees for all to authenticated
  using (exists (
    select 1 from public.board_cards c
    join public.board_columns bc on bc.id = c.column_id
    where c.id = card_id and public.is_board_accessible(bc.board_id)
  ));

create policy "card_checklist_items_all"
  on public.card_checklist_items for all to authenticated
  using (exists (
    select 1 from public.board_cards c
    join public.board_columns bc on bc.id = c.column_id
    where c.id = card_id and public.is_board_accessible(bc.board_id)
  ));

-- ============================================================
-- GRANTS
-- ============================================================

grant select, insert, update, delete on public.boards to authenticated;
grant select, insert, delete on public.board_members to authenticated;
grant select, insert, update, delete on public.board_columns to authenticated;
grant select, insert, update, delete on public.board_cards to authenticated;
grant select, insert, update, delete on public.card_labels to authenticated;
grant select, insert, delete on public.card_assignees to authenticated;
grant select, insert, update, delete on public.card_checklist_items to authenticated;
grant execute on function public.is_board_accessible(uuid) to authenticated;
