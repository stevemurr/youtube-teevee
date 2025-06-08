-- Migration: Add unique constraint to channels table
-- This prevents duplicate channel entries for the same user

-- First, remove any existing duplicates (keeping the first occurrence)
DELETE FROM channels 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM channels 
  GROUP BY user_id, youtube_channel_id
);

-- Create a new table with the correct structure
CREATE TABLE channels_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  youtube_channel_id TEXT NOT NULL,
  channel_name TEXT,
  thumbnail_url TEXT,
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, youtube_channel_id)
);

-- Copy data from the old table
INSERT INTO channels_new (id, user_id, youtube_channel_id, channel_name, thumbnail_url, enabled, created_at)
SELECT id, user_id, youtube_channel_id, channel_name, thumbnail_url, enabled, created_at
FROM channels;

-- Drop the old table
DROP TABLE channels;

-- Rename the new table
ALTER TABLE channels_new RENAME TO channels;

-- Recreate the index
CREATE INDEX idx_channels_user_id ON channels(user_id);