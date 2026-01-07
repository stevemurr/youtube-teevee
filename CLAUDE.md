# YouTube TeeVee - Architecture

## Overview

A web app that transforms YouTube subscriptions into a traditional TV experience. Videos are scheduled across a 24-hour timeline - users watch what's "on" right now, like classic TV.

## Core Concepts

- **Channels**: Each YouTube subscription = one TV channel
- **Timeline**: Global synchronized 24-hour schedule, all channels progress together
- **No Time Control**: Can't skip/rewind - watch "live" like traditional TV
- **Prime Time**: Recent/popular videos scheduled during peak hours (8-10pm)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| State | Zustand (persisted to localStorage) |
| Backend | Express + TypeScript |
| Database | SQLite (WAL mode) |
| Video | YouTube IFrame API |
| Proxy | Caddy |
| Dev Environment | Docker Compose |

## Project Structure

```
youtube-teevee/
├── api/                    # Backend
│   ├── src/
│   │   ├── routes/         # Express routes (auth, channels, timeline, settings)
│   │   ├── services/       # Business logic (timeline-generator, cache-manager)
│   │   └── middleware/     # Auth middleware
│   └── database/
│       ├── schema.sql      # SQLite schema
│       └── app.db          # Database file
├── frontend/               # Frontend
│   ├── src/
│   │   ├── components/     # UI, VideoPlayer, TVGuide, ChannelList
│   │   ├── pages/          # Auth, Guide, Watch, Settings
│   │   ├── store/          # Zustand store (useTVStore)
│   │   └── api/            # Axios client
│   └── vite.config.ts
├── caddy/
│   └── Caddyfile           # Routes /api/* to backend, /* to frontend
├── scripts/
│   ├── populate-db.sh      # Fetches subscriptions/videos via yt-dlp
│   └── fix-thumbnails.sh   # Database thumbnail URL fixer
└── docker-compose.yml      # Runs api, frontend, caddy services
```

## Data Flow

1. **Database Population** (offline, via yt-dlp)
   - `scripts/populate-db.sh` uses browser cookies to fetch subscriptions
   - Downloads video metadata for each channel
   - Stores in SQLite (channels, video_cache tables)

2. **Timeline Generation** (on-demand)
   - API generates 24-hour schedule from cached videos
   - Prime time (8-10pm): 70% recent + 30% popular videos
   - Stored in `timelines` table, cached in memory

3. **Video Playback**
   - Frontend calculates current program from timeline + wall clock
   - YouTube IFrame API loads video at calculated seek position
   - Channel switching recalculates position for new channel

## Database Schema

```sql
users           -- Local user (id=1 for database-mode auth)
channels        -- YouTube subscriptions (channel_id, name, thumbnail)
video_cache     -- Video metadata (video_id, title, duration, published_at)
timelines       -- Generated schedules (date, timeline_data JSON)
```

## Key Files

- `api/src/services/timeline-generator.ts` - Schedule generation algorithm
- `api/src/routes/timeline.ts` - Timeline API endpoints
- `frontend/src/store/useTVStore.ts` - Global state management
- `frontend/src/components/VideoPlayer/GlobalVideoPlayer.tsx` - YouTube player wrapper
- `frontend/src/pages/Guide.tsx` - TV guide grid view

## Development

```bash
# Start all services
docker-compose up

# Access app
open http://localhost:8091

# Populate/refresh video data
./scripts/populate-db.sh --browser chrome
```

## Design Notes

- **Glassmorphism UI**: Dark theme with translucent/blur effects
- **No YouTube API keys**: All data fetched via yt-dlp using browser cookies
- **Single user**: Designed for personal use (user id=1 hardcoded)
