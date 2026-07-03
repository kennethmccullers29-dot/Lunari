create table workspace_subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  workspace_id           uuid        not null unique references workspaces(id) on delete cascade,
  stripe_customer_id     text        unique,
  stripe_subscription_id text        unique,
  plan                   text        not null default 'free',   -- 'free' | 'pro' | 'business'
  status                 text        not null default 'active', -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
  current_period_end     timestamptz,
  cancel_at_period_end   boolean     not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table workspace_subscriptions enable row level security;

-- Members can read their workspace subscription
create policy "subscriptions_select" on workspace_subscriptions for select
using (
  exists (
    select 1 from workspace_members
    where workspace_members.workspace_id = workspace_subscriptions.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

-- Service role (webhook) handles all writes — no RLS for insert/update/delete
-- (service role bypasses RLS by default)

grant select on workspace_subscriptions to authenticated;
grant all    on workspace_subscriptions to service_role;
