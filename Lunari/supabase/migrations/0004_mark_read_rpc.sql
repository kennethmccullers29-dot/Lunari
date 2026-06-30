-- ============================================================
-- MARK READ RPC
--
-- message_reads enforces uniqueness via two PARTIAL unique indexes (see
-- 0003) rather than a plain composite UNIQUE, because the table's
-- channel_id/dm_conversation_id pair is nullable-exactly-one-of. PostgREST's
-- client-side `.upsert(..., { onConflict })` only ever emits a bare
-- `ON CONFLICT (cols)`, with no WHERE predicate — Postgres then can't match
-- that target to a partial index and fails with 42P10 ("there is no unique
-- or exclusion constraint matching the ON CONFLICT specification"). Raw SQL
-- doesn't have that limitation: `ON CONFLICT (cols) WHERE <predicate>` is
-- valid syntax, just not reachable through the REST upsert query param. So
-- the upsert moves server-side into this RPC instead of being expressed as
-- a client-side upsert call.
-- ============================================================
create function public.mark_read(_channel_id uuid default null, _dm_conversation_id uuid default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if _channel_id is not null then
    insert into public.message_reads (user_id, channel_id, last_read_at)
    values (auth.uid(), _channel_id, now())
    on conflict (user_id, channel_id) where channel_id is not null
    do update set last_read_at = excluded.last_read_at;
  elsif _dm_conversation_id is not null then
    insert into public.message_reads (user_id, dm_conversation_id, last_read_at)
    values (auth.uid(), _dm_conversation_id, now())
    on conflict (user_id, dm_conversation_id) where dm_conversation_id is not null
    do update set last_read_at = excluded.last_read_at;
  end if;
end;
$$;

grant execute on function public.mark_read(uuid, uuid) to authenticated;
