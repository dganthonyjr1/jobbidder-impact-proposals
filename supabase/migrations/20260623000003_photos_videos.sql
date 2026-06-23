-- Create photos_videos table for storing media files
CREATE TABLE photos_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES contractor_applications(id) ON DELETE CASCADE,
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('photo', 'video')),
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  duration_seconds INTEGER, -- For videos
  
  -- Storage
  storage_path TEXT NOT NULL UNIQUE,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT, -- For videos
  
  -- AI Analysis
  ai_analysis JSONB, -- { "objects": [...], "damage_level": "high|medium|low", "tags": [...], "description": "..." }
  is_damage_photo BOOLEAN DEFAULT false,
  damage_type TEXT, -- e.g., "roof", "window", "siding", "foundation"
  
  -- Metadata
  title TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  location_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Ordering
  display_order INTEGER DEFAULT 0,
  
  -- Status
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 943718400) -- 900MB max
);

-- Create indexes for faster queries
CREATE INDEX photos_videos_user_id_idx ON photos_videos(user_id);
CREATE INDEX photos_videos_proposal_id_idx ON photos_videos(proposal_id);
CREATE INDEX photos_videos_contractor_id_idx ON photos_videos(contractor_id);
CREATE INDEX photos_videos_file_type_idx ON photos_videos(file_type);
CREATE INDEX photos_videos_created_at_idx ON photos_videos(created_at DESC);
CREATE INDEX photos_videos_is_public_idx ON photos_videos(is_public);
CREATE INDEX photos_videos_damage_type_idx ON photos_videos(damage_type);
CREATE INDEX photos_videos_tags_idx ON photos_videos USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE photos_videos ENABLE ROW LEVEL SECURITY;

-- Policies for photos_videos
CREATE POLICY "Users can view their own photos/videos"
  ON photos_videos
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own photos/videos"
  ON photos_videos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own photos/videos"
  ON photos_videos
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own photos/videos"
  ON photos_videos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Public can view public photos/videos"
  ON photos_videos
  FOR SELECT
  TO anon
  USING (is_public = true);

-- Create media_galleries table for organizing photos/videos into galleries
CREATE TABLE media_galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES contractor_applications(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  gallery_type VARCHAR(50) NOT NULL CHECK (gallery_type IN ('before_after', 'project', 'portfolio', 'damage_assessment')),
  
  -- Ordering
  display_order INTEGER DEFAULT 0,
  
  -- Status
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create junction table for photos/videos in galleries
CREATE TABLE gallery_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES media_galleries(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES photos_videos(id) ON DELETE CASCADE,
  
  display_order INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(gallery_id, media_id)
);

-- Create indexes for galleries
CREATE INDEX media_galleries_user_id_idx ON media_galleries(user_id);
CREATE INDEX media_galleries_proposal_id_idx ON media_galleries(proposal_id);
CREATE INDEX media_galleries_contractor_id_idx ON media_galleries(contractor_id);
CREATE INDEX media_galleries_gallery_type_idx ON media_galleries(gallery_type);
CREATE INDEX gallery_media_gallery_id_idx ON gallery_media(gallery_id);
CREATE INDEX gallery_media_media_id_idx ON gallery_media(media_id);

-- Enable RLS on galleries
ALTER TABLE media_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_media ENABLE ROW LEVEL SECURITY;

-- Gallery policies
CREATE POLICY "Users can view their own galleries"
  ON media_galleries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own galleries"
  ON media_galleries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage gallery media"
  ON gallery_media
  FOR ALL
  TO authenticated
  USING (
    gallery_id IN (
      SELECT id FROM media_galleries WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    gallery_id IN (
      SELECT id FROM media_galleries WHERE user_id = auth.uid()
    )
  );
