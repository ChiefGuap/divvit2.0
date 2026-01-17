-- bill_participants table for multiplayer bill splitting
-- Run this in your Supabase SQL Editor

CREATE TABLE bill_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_guest BOOLEAN DEFAULT false NOT NULL,
  avatar_url TEXT,
  color TEXT,
  initials TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bill_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read participants for bills they're part of
CREATE POLICY "Users can view bill participants"
  ON bill_participants FOR SELECT
  USING (
    bill_id IN (
      SELECT id FROM bills WHERE host_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Policy: Bill hosts can insert participants (or users joining themselves)
CREATE POLICY "Hosts can add participants"
  ON bill_participants FOR INSERT
  WITH CHECK (
    bill_id IN (SELECT id FROM bills WHERE host_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Policy: Bill hosts can delete participants
CREATE POLICY "Hosts can remove participants"
  ON bill_participants FOR DELETE
  USING (
    bill_id IN (SELECT id FROM bills WHERE host_id = auth.uid())
  );

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE bill_participants;

-- Add index for faster queries
CREATE INDEX idx_bill_participants_bill_id ON bill_participants(bill_id);
CREATE INDEX idx_bill_participants_user_id ON bill_participants(user_id);
