-- Add group_photo_url column to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS group_photo_url TEXT;

-- Create bill-photos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bill-photos', 'bill-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload bill photos
CREATE POLICY "Users can upload bill photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'bill-photos' AND auth.role() = 'authenticated');

-- Allow anyone to view bill photos (public bucket)
CREATE POLICY "Anyone can view bill photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'bill-photos');
