-- ============================================================
-- ONBOARDING
--
-- Tracks whether a user has completed the first-run profile
-- setup. NULL = not yet onboarded; set to now() when the
-- onboarding modal is dismissed. Used server-side to decide
-- whether to show the welcome modal on /workspaces.
-- ============================================================
alter table public.profiles add column onboarded_at timestamptz;
