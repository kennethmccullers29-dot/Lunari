-- Drop existing attachment_type check constraint (name may vary by Postgres version)
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.messages'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%attachment_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- Add updated constraint including file and voice types
ALTER TABLE public.messages
  ADD CONSTRAINT messages_attachment_type_check
    CHECK (attachment_type IN ('image', 'gif', 'file', 'voice'));

-- Store original filename for file/voice attachments
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_name text;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated;
