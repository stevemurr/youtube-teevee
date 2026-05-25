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
| Backend | Hono + TypeScript |
| Database | SQLite (WAL mode) |
| Video | YouTube IFrame API |

## Project Structure

```
youtube-teevee/
├── src/                    # Server source
│   ├── routes/             # Hono routes (auth, channels, timeline, settings)
│   ├── services/           # Business logic (timeline-generator, cache-manager)
│   ├── middleware/         # Auth middleware
│   └── server.ts           # Entrypoint (Bun.serve + Hono)
├── frontend/               # React frontend (built by Vite, served by server)
│   ├── src/
│   │   ├── components/     # UI, VideoPlayer, TVGuide, ChannelList
│   │   ├── pages/          # Auth, Guide, Watch, Settings
│   │   ├── store/          # Zustand store (useTVStore)
│   │   └── api/            # Axios client
│   └── vite.config.ts
├── database/               # SQLite DB (auto-created on first run)
└── scripts/
    └── build.sh            # Builds the self-contained binary
```

## Data Flow

1. **Database Population** (via API-driven setup)
   - Setup route uses yt-dlp with browser cookies to fetch subscriptions → `subscriptions.json`
   - Data refresh fetches video metadata per channel using `cookies.txt`
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

- `src/services/timeline-generator.ts` - Schedule generation algorithm
- `src/routes/timeline.ts` - Timeline API endpoints
- `frontend/src/store/useTVStore.ts` - Global state management
- `frontend/src/components/VideoPlayer/GlobalVideoPlayer.tsx` - YouTube player wrapper
- `frontend/src/pages/Guide.tsx` - TV guide grid view

## Development

```bash
# Build self-contained binary
./scripts/build.sh

# Run the binary
./youtube-tv

# Access app
open http://localhost:8091
```

## Design Notes

- **Glassmorphism UI**: Dark theme with translucent/blur effects
- **No YouTube API keys**: All data fetched via yt-dlp using browser cookies
- **Single user**: Designed for personal use (user id=1 hardcoded)
