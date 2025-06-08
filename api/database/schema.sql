-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  settings TEXT DEFAULT '{}', -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Channels table (user's subscriptions)
CREATE TABLE IF NOT EXISTS channels (
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

-- Timeline metadata
CREATE TABLE IF NOT EXISTS timelines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  timeline_data TEXT, -- JSON string of entire timeline
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);

-- Video metadata cache
CREATE TABLE IF NOT EXISTS video_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT UNIQUE NOT NULL,
  title TEXT,
  duration INTEGER, -- seconds
  thumbnail_url TEXT,
  published_at TEXT, -- ISO date string
  view_count INTEGER,
  channel_id TEXT,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscription cache
CREATE TABLE IF NOT EXISTS subscription_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  channel_data TEXT, -- JSON string of subscription data
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);
CREATE INDEX IF NOT EXISTS idx_timelines_user_date ON timelines(user_id, date);
CREATE INDEX IF NOT EXISTS idx_video_cache_video_id ON video_cache(video_id);
CREATE INDEX IF NOT EXISTS idx_subscription_cache_user_id ON subscription_cache(user_id);