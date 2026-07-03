-- AI conversations and messages for the built-in AI chatbot

CREATE TABLE ai_conversations (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid       REFERENCES workspaces(id)   ON DELETE CASCADE NOT NULL,
  user_id     uuid        REFERENCES auth.users(id)    ON DELETE CASCADE NOT NULL,
  title       text        NOT NULL DEFAULT 'New Conversation',
  created_at  timestamptz DEFAULT now()                NOT NULL
);

CREATE TABLE ai_messages (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id  uuid        REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role             text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content          text        NOT NULL,
  created_at       timestamptz DEFAULT now()                NOT NULL
);

CREATE INDEX ai_messages_conversation_idx ON ai_messages (conversation_id, created_at);
CREATE INDEX ai_conversations_user_workspace_idx ON ai_conversations (user_id, workspace_id, created_at DESC);

-- RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_select" ON ai_conversations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ai_conversations_insert" ON ai_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_conversations_update" ON ai_conversations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "ai_conversations_delete" ON ai_conversations
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "ai_messages_select" ON ai_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "ai_messages_insert" ON ai_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_messages TO authenticated;
