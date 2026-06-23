-- Photo enhancements table for LLM processing results
CREATE TABLE IF NOT EXISTS photo_enhancements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES photos_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enhancement_type TEXT NOT NULL CHECK (enhancement_type IN (
    'enhance', 'damage-assessment', 'auto-tag', 'auto-describe', 
    'upscale', 'background-removal', 'color-correction'
  )),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'claude', 'replicate')),
  result JSONB,
  enhanced_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER,
  cost DECIMAL(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS photo_enhancements_media_idx ON photo_enhancements(media_id);
CREATE INDEX IF NOT EXISTS photo_enhancements_user_idx ON photo_enhancements(user_id);
CREATE INDEX IF NOT EXISTS photo_enhancements_status_idx ON photo_enhancements(status);
CREATE INDEX IF NOT EXISTS photo_enhancements_provider_idx ON photo_enhancements(provider);
CREATE INDEX IF NOT EXISTS photo_enhancements_type_idx ON photo_enhancements(enhancement_type);

-- Enable Row Level Security
ALTER TABLE photo_enhancements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own enhancements"
  ON photo_enhancements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create enhancements for their media"
  ON photo_enhancements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enhancements"
  ON photo_enhancements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert/update (for async processing)
CREATE POLICY "Service role can manage enhancements"
  ON photo_enhancements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
