# YouTube TV Guide Web App - Design Document

## Overview
A modern web application that transforms YouTube subscriptions into a traditional TV experience with synchronized timeline-based programming across all channels.

## Core Concept
- **Channels**: Each YouTube subscription becomes a TV channel
- **Timeline**: Global synchronized timeline where all channels progress simultaneously
- **Programming**: Videos randomly scheduled across timeline to simulate TV programming
- **No Time Control**: Users cannot skip forward/backward - must watch "live" like traditional TV
- **Immersive Interface**: Full-screen web app with custom TV guide and glassy modern UI

## Key Features

### 1. Channel Management
- Automatically enumerate user's YouTube subscriptions via OAuth
- Each subscription = one TV channel
- Display channel list with subscriber's avatar/name
- Support for enabling/disabling specific channels

### 2. Timeline System
- **Global Clock**: Single timeline shared across all channels
- **Program Scheduling**: Randomly distribute videos across timeline with realistic gaps
- **Current Time Indicator**: Visual playhead showing "now" across all channels
- **Duration**: Generate 24-hour programming blocks that loop

### 3. TV Guide Interface
- **Grid Layout**: Time slots (x-axis) vs Channels (y-axis)
- **Program Blocks**: Show video titles, thumbnails, duration
- **Current Program Highlight**: Visual indicator of what's playing now
- **Channel Navigation**: Up/down arrows or click to change channels

### 4. Virtual Video Playback
- **Synchronized Playback**: All channels progress at same rate
- **Channel Switching**: Instant switch between channels at current timeline position
- **Auto-progression**: Videos automatically advance when ended
- **Gap Handling**: Show "intermission" or channel branding during gaps

## Technical Architecture

### Frontend Stack
```
React 18 + TypeScript
Tailwind CSS + Custom Glassmorphism Components
React Router (SPA routing)
Zustand (State Management)
React Query (API Caching)
YouTube Iframe API (Video Playback)
```

### Backend Stack
```
Node.js + Express + TypeScript
YouTube Data API v3 (Server-side proxy)
SQLite (Database & Caching)
JWT Authentication
Rate limiting & API quota management
In-memory caching for active timelines
```

### Application Structure
```
📁 Frontend (/src)
├── 📁 components/
│   ├── TVGuide/
│   ├── VideoPlayer/
│   ├── ChannelList/
│   └── UI/ (Glass components)
├── 📁 pages/
│   ├── Guide.tsx
│   ├── Watch.tsx
│   ├── Settings.tsx
│   └── Auth.tsx
├── 📁 hooks/
├── 📁 store/
└── 📁 utils/

📁 Backend (/api)
├── 📁 routes/
│   ├── auth.ts
│   ├── channels.ts
│   ├── timeline.ts
│   └── videos.ts
├── 📁 services/
│   ├── youtube-api.ts
│   ├── timeline-generator.ts
│   ├── cache-manager.ts
│   └── database.ts
├── 📁 middleware/
├── 📁 database/
│   ├── schema.sql
│   ├── migrations/
│   └── app.db (SQLite file)
└── 📁 cache/
    └── timelines/ (JSON files)
```

## Specific Requirements

### Timeline Management
- **Persistence**: Timeline persists in SQLite database with daily refresh
- **Duration**: Generate full 24-hour programming blocks
- **Regeneration**: Daily refresh at midnight or manual regeneration
- **Caching**: Active timelines cached in memory for fast access

### Programming Strategy
- **Prime Time (8-10pm)**: Schedule new videos (uploaded within last week) or popular videos (high view count)
- **Regular Hours**: Random selection from channel's video catalog
- **Intermission**: Brief "Coming Up Next" or channel branding between videos

### Technical Implementation
- **Virtual Playback**: No background video streaming - calculate what should be playing at current timestamp
- **On-Demand Loading**: When user switches channels, load calculated video at correct timestamp
- **Channel Limit**: Support up to 25 channels initially
- **Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)
- **Connectivity**: Requires internet connection - no offline functionality

### Content Filtering
- **Configurable Options**: User settings for excluding shorts, livestreams, max duration
- **Default Filters**: Exclude videos longer than 2 hours, include shorts by default

## User Interface Design

### Design System - Modern Glassy Aesthetic
**Framework**: React + Tailwind CSS with custom glassmorphism components
**Theme**: Dark mode with transparent/translucent elements
**Visual Style**: Modern glassy UI with blur effects and subtle animations

### Core Design Elements
```css
/* Glassy container base */
.glass-container {
  @apply bg-black/20 backdrop-blur-md border border-white/10 rounded-xl;
}

/* Primary glassy overlay */
.glass-overlay {
  @apply bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-lg;
  @apply border border-white/20 rounded-2xl shadow-2xl;
}

/* Channel card styling */
.channel-card {
  @apply bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg;
  @apply hover:bg-white/5 hover:border-white/20 transition-all duration-300;
}
```

### Application Routes & Views

#### `/guide` - TV Guide Grid
- **Background**: Dark gradient with subtle pattern/noise texture
- **Guide Container**: Large glassmorphism panel with rounded corners
- **Time Header**: Horizontal sticky header with translucent background
- **Channel Rows**: Glass-styled rows with hover effects and smooth transitions
- **Program Blocks**: Semi-transparent cards with gradient borders
- **Current Time Indicator**: Glowing vertical line with blur effect

#### `/watch` - Video Player View
- **Video Player**: Full-screen YouTube embed with minimal glassy overlay controls
- **Channel HUD**: Translucent overlay (top-left) showing current channel name/logo
- **Progress Bar**: Thin glassy bar at bottom with timeline indicators
- **Channel Selector**: Collapsible sidebar with frosted glass background

#### `/settings` - Configuration Panel
- **Modal Design**: Full-screen overlay with centered glassy container
- **Section Cards**: Each setting group in separate glass containers
- **Form Elements**: Custom-styled inputs with glass aesthetic
- **Buttons**: Gradient glass buttons with hover animations

#### `/auth` - YouTube Login
- **Centered Layout**: Single glass card with YouTube OAuth flow
- **Branding**: App logo and description
- **Call-to-Action**: "Connect to YouTube" with permission explanations

## Data Storage Schema

### SQLite Database Schema
```sql
-- Users table
CREATE TABLE users (
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
CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  youtube_channel_id TEXT NOT NULL,
  channel_name TEXT,
  thumbnail_url TEXT,
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Timeline metadata
CREATE TABLE timelines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  timeline_data TEXT, -- JSON string of entire timeline
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);

-- Video metadata cache
CREATE TABLE video_cache (
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
CREATE TABLE subscription_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  channel_data TEXT, -- JSON string of subscription data
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_channels_user_id ON channels(user_id);
CREATE INDEX idx_timelines_user_date ON timelines(user_id, date);
CREATE INDEX idx_video_cache_video_id ON video_cache(video_id);
CREATE INDEX idx_subscription_cache_user_id ON subscription_cache(user_id);
```

### In-Memory Cache Structure (Node.js)
```javascript
// Runtime cache for active timelines and frequently accessed data
const memoryCache = {
  // Timeline data for fast access
  timelines: new Map(), // Key: "user123:2025-06-07", Value: timeline object
  
  // Video metadata for quick lookups
  videos: new Map(), // Key: videoId, Value: video metadata
  
  // User subscriptions for fast access
  subscriptions: new Map(), // Key: userId, Value: subscription array
  
  // Cache timestamps for TTL management
  timestamps: new Map()
};

// Example timeline structure in memory
"user123:2025-06-07": {
  "UC-lHJZR3Gqxm24_Vd_AJ5Yw": [ // Channel timeline
    {
      "startTime": "00:00:00",
      "endTime": "00:15:23", 
      "videoId": "dQw4w9WgXcQ",
      "title": "Video Title",
      "duration": 923, // seconds
      "type": "video" // or "intermission"
    }
  ]
}
```

### File-based Cache (Optional backup)
```
📁 /cache
├── timelines/
│   ├── user123_2025-06-07.json
│   └── user456_2025-06-07.json
├── videos/
│   └── video_metadata.json
└── subscriptions/
    └── user_subscriptions.json
```

## Data Flow

### 1. User Authentication Flow
```
1. User visits /auth
2. Click "Connect to YouTube"
3. Redirect to YouTube OAuth consent screen
4. User grants permissions (youtube.readonly scope)
5. Backend receives auth code, exchanges for tokens
6. Store encrypted tokens in PostgreSQL
7. Redirect to /guide with JWT session token
```

### 2. Channel Setup & Timeline Generation
```
1. Backend fetches user's subscriptions from YouTube API
2. Cache subscription metadata in SQLite subscription_cache table
3. Store enabled channels in SQLite channels table
4. Generate initial 24-hour timeline:
   - Regular Hours: Random video selection
   - Prime Time (8-10pm): 70% recent + 30% popular videos
   - Intermissions: 2-5 minute gaps
5. Store timeline in SQLite timelines table
6. Load timeline into memory cache for fast access
```

### 3. Virtual Playback System
```javascript
// API endpoint: GET /api/timeline/current-program
function getCurrentProgram(userId, channelId, currentTime) {
  // Check memory cache first
  let timeline = memoryCache.timelines.get(`user${userId}:${currentDate}`);
  
  // If not in memory, load from SQLite
  if (!timeline) {
    timeline = await db.get(
      'SELECT timeline_data FROM timelines WHERE user_id = ? AND date = ?',
      [userId, currentDate]
    );
    // Cache in memory for future requests
    memoryCache.timelines.set(`user${userId}:${currentDate}`, JSON.parse(timeline.timeline_data));
  }
  
  // Find program scheduled at current time
  // Calculate elapsed time within that program
  // Return video ID and seek position
}
```

### 4. Frontend State Management
```javascript
// Zustand store
const useTVStore = create((set, get) => ({
  currentChannel: null,
  currentTime: new Date(),
  timeline: {},
  channels: [],
  
  switchChannel: (channelId) => {
    // Calculate current program for new channel
    // Update video player with new content
    // Sync with timeline position
  },
  
  refreshTimeline: async () => {
    // Fetch fresh timeline from backend
    // Update local state
  }
}))
```

## API Endpoints

### Authentication
```
POST /api/auth/youtube     - Initiate YouTube OAuth flow
POST /api/auth/callback    - Handle OAuth callback
POST /api/auth/refresh     - Refresh access token
DELETE /api/auth/logout    - Clear session
```

### Channels & Content
```
GET /api/channels                    - Get user's enabled channels
PUT /api/channels/:id/toggle         - Enable/disable channel
GET /api/timeline/current            - Get current day's timeline
GET /api/timeline/current-program    - Get what's playing now on channel
POST /api/timeline/regenerate        - Force timeline regeneration
```

### User Preferences
```
GET /api/settings          - Get user settings
PUT /api/settings          - Update user settings
GET /api/subscriptions     - Refresh subscriptions from YouTube
```

## Prime Time Algorithm

### Video Classification
- **New Videos**: Uploaded within last 7 days
- **Popular Videos**: Top 10% by view count within channel
- **Fallback**: If insufficient new/popular videos, use random selection

### Scheduling Priority
```javascript
const scheduleVideo = (timeSlot, channel) => {
  const isPrimeTime = timeSlot >= '20:00' && timeSlot <= '22:00';
  
  if (isPrimeTime) {
    return {
      newVideos: 0.7,      // 70% recent videos
      popularVideos: 0.3   // 30% popular videos
    };
  } else {
    return randomSelection(channel.videos);
  }
};
```

## Error Handling & Edge Cases

### Video Availability Issues
- **Deleted Videos**: Skip to next program in timeline, show brief "Technical Difficulties" message
- **Private/Restricted Videos**: Replace with intermission content
- **Age-Restricted Content**: Skip if user not logged into YouTube
- **Geo-blocked Videos**: Fallback to next available video in timeline

### API Failures
- **Rate Limit Exceeded**: Use cached data, show warning in UI
- **Network Offline**: Display "No Signal" screen with cached guide data
- **OAuth Token Expired**: Automatically refresh or prompt re-authentication
- **YouTube API Service Down**: Graceful degradation with cached content

### Timeline Edge Cases
- **Insufficient Videos**: Fill gaps with longer intermissions
- **Channel with No Videos**: Show "Off Air" placeholder
- **Timezone Changes**: Recalculate current time position
- **Daylight Saving Time**: Handle clock adjustments smoothly

## Deployment & Infrastructure

### Frontend Deployment
- **Platform**: Vercel, Netlify, or AWS Amplify
- **Build**: Vite for fast development and optimized production builds
- **CDN**: Static assets served via CDN for fast loading
- **Domain**: Custom domain (e.g., `youtubetv.app`)

### Backend Deployment
- **Platform**: Railway, Render, or AWS ECS
- **Database**: SQLite file stored with application
- **Persistent Storage**: Volume mount for SQLite database file
- **Monitoring**: Sentry for error tracking, logging

### Environment Variables
```
# YouTube API
YOUTUBE_API_KEY=your_api_key
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret

# Database
DATABASE_PATH=./database/app.db
CACHE_DIR=./cache

# Auth
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# App Config
FRONTEND_URL=https://youtubetv.app
BACKEND_URL=https://api.youtubetv.app
```

## Development Workflow

### Local Development
```bash
# Backend
cd api
npm install
npm run migrate     # Creates SQLite database and runs migrations
npm run dev         # Runs on localhost:3001

# Frontend  
cd frontend
npm install
npm run dev         # Runs on localhost:3000

# Database Setup
npm run db:create   # Creates fresh SQLite database
npm run db:seed     # Seeds with sample data (optional)
npm run db:reset    # Drops and recreates database
```

### Database Operations
```javascript
// Database service (database.ts)
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function initDatabase() {
  const db = await open({
    filename: process.env.DATABASE_PATH || './database/app.db',
    driver: sqlite3.Database
  });
  
  // Run migrations
  await db.exec(fs.readFileSync('./database/schema.sql', 'utf8'));
  
  return db;
}

// Cache manager (cache-manager.ts)
class CacheManager {
  private memoryCache = new Map();
  
  async getTimeline(userId: string, date: string) {
    const key = `${userId}:${date}`;
    
    // Check memory first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Load from SQLite
    const result = await db.get(
      'SELECT timeline_data FROM timelines WHERE user_id = ? AND date = ?',
      [userId, date]
    );
    
    if (result) {
      const timeline = JSON.parse(result.timeline_data);
      this.memoryCache.set(key, timeline);
      return timeline;
    }
    
    return null;
  }
  
  async setTimeline(userId: string, date: string, timeline: any) {
    // Store in SQLite
    await db.run(
      'INSERT OR REPLACE INTO timelines (user_id, date, timeline_data) VALUES (?, ?, ?)',
      [userId, date, JSON.stringify(timeline)]
    );
    
    // Cache in memory
    this.memoryCache.set(`${userId}:${date}`, timeline);
  }
}
```

### CSS Framework Integration

### Tailwind CSS Setup
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      backdropBlur: {
        'xs': '2px',
      },
      colors: {
        glass: {
          bg: 'rgba(0, 0, 0, 0.2)',
          border: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.05)',
        }
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
  ]
}
```

### Visual States & Animations
- **Current Program**: Pulsing glow border with `ring-2 ring-blue-400/50 animate-pulse`
- **Intermission**: Frosted glass card with animated gradient background
- **Loading**: Smooth spinner with glass morphism backdrop blur
- **Error State**: Red-tinted glass overlay with subtle shake animation
- **No Signal**: Animated static effect with dark glass container

### Performance Considerations
- **Code Splitting**: Route-based code splitting with React.lazy()
- **Image Optimization**: Lazy loading for channel thumbnails and video previews
- **API Caching**: React Query for intelligent caching and background updates
- **Glass Effect Optimization**: Hardware acceleration with transform3d
- **Timeline Virtualization**: Render only visible time slots in guide
- **SQLite Optimization**: WAL mode for concurrent reads, prepared statements
- **Memory Caching**: In-memory timeline cache with TTL management
- **Database Indexing**: Optimized indexes for fast user and timeline queries

## Success Metrics

### User Engagement
- Daily active users and session duration
- Channel switching frequency
- Prime time viewership patterns
- Timeline generation and refresh rates

### Technical Performance
- Page load times and Core Web Vitals
- API response times and error rates
- Video playback success rate
- Cache hit ratios for timeline and video data

---

## SQLite Benefits for Early Development

### Simplified Development Setup
- **Zero External Dependencies**: No need for PostgreSQL or Redis servers
- **File-based Database**: Single SQLite file for easy backup and version control
- **Fast Local Development**: No network latency, immediate database access
- **Easy Deployment**: Database travels with application code

### Performance for Early Stage
- **Sufficient Concurrency**: SQLite handles multiple concurrent reads efficiently
- **Fast Queries**: Excellent performance for single-user or small multi-user scenarios
- **In-Memory Caching**: Compensates for any SQLite limitations with active data caching
- **Simple Scaling**: Easy to migrate to PostgreSQL later when user base grows

### Development Advantages
```bash
# Simple database operations
npm run db:backup   # Copy SQLite file to backups/
npm run db:restore  # Restore from backup file
npm run db:clone    # Create development copy
```

This web app design provides complete creative control over the user experience while maintaining all the core TV guide functionality. The simplified SQLite architecture supports rapid development and can easily handle hundreds of concurrent users before requiring migration to a more complex database setup.
