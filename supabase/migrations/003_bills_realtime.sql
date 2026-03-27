-- Enable Supabase Realtime on the bills table
-- This allows clients to subscribe to status changes (e.g., draft → active)
-- Required for guests to detect when the host starts splitting in real time.

ALTER PUBLICATION supabase_realtime ADD TABLE bills;
