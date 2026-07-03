-- Team Wiki pages
create table wiki_pages (
  id          uuid        primary key default gen_random_uuid(),
  workspace_id uuid       not null references workspaces(id) on delete cascade,
  title       text        not null default 'Untitled',
  icon        text        not null default '📄',
  content     jsonb       not null default '{"type":"doc","content":[]}'::jsonb,
  created_by  uuid        references profiles(id) on delete set null,
  updated_by  uuid        references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table wiki_pages enable row level security;

-- Workspace members can read all pages
create policy "wiki_pages_select" on wiki_pages for select
using (
  exists (
    select 1 from workspace_members
    where workspace_members.workspace_id = wiki_pages.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

-- Workspace members can create pages
create policy "wiki_pages_insert" on wiki_pages for insert
with check (
  exists (
    select 1 from workspace_members
    where workspace_members.workspace_id = wiki_pages.workspace_id
      and workspace_members.user_id = auth.uid()
  )
  and created_by = auth.uid()
);

-- Workspace members can update any page (collaborative editing)
create policy "wiki_pages_update" on wiki_pages for update
using (
  exists (
    select 1 from workspace_members
    where workspace_members.workspace_id = wiki_pages.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

-- Only creator or admin/owner can delete
create policy "wiki_pages_delete" on wiki_pages for delete
using (
  created_by = auth.uid()
  or exists (
    select 1 from workspace_members
    where workspace_members.workspace_id = wiki_pages.workspace_id
      and workspace_members.user_id = auth.uid()
      and role in ('owner', 'admin')
  )
);

-- Auto-update updated_at on every row change
create or replace function update_wiki_page_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger wiki_pages_updated_at
  before update on wiki_pages
  for each row execute function update_wiki_page_updated_at();
