#!/bin/bash

# YouTube TV Database Populator
# This script uses yt-dlp to populate the database without YouTube API keys

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BROWSER="chrome"
DB_PATH="api/database/app.db"
VIDEOS_PER_CHANNEL=50

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --browser)
      BROWSER="$2"
      shift 2
      ;;
    --videos)
      VIDEOS_PER_CHANNEL="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--browser chrome|firefox|safari|edge] [--videos NUMBER]"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}🚀 YouTube TV Database Populator${NC}"
echo -e "📊 Browser: $BROWSER"
echo -e "📹 Videos per channel: $VIDEOS_PER_CHANNEL"
echo ""

# Check if yt-dlp is installed
if ! command -v yt-dlp &> /dev/null; then
  echo -e "${RED}❌ yt-dlp is not installed!${NC}"
  echo "Please install it first:"
  echo "  macOS: brew install yt-dlp"
  echo "  Windows/Linux: pip install yt-dlp"
  exit 1
fi

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
  echo -e "${YELLOW}⚠️  Database not found. Creating new database...${NC}"
  cd api && npm run db:create && cd ..
fi

# Create temp directory for JSON files
TEMP_DIR=$(mktemp -d)
echo -e "📁 Using temp directory: $TEMP_DIR"

# Step 1: Fetch subscriptions
echo -e "\n${GREEN}📺 Fetching your YouTube subscriptions...${NC}"
echo "(This requires you to be logged into YouTube in $BROWSER)"

# Try to get subscription data
SUBS_FILE="$TEMP_DIR/subscriptions.json"
if yt-dlp --cookies-from-browser "$BROWSER" \
         --dump-json \
         --flat-playlist \
         -q \
         "https://www.youtube.com/feed/channels" > "$SUBS_FILE" 2>/dev/null; then
  echo -e "${GREEN}✅ Successfully fetched subscriptions${NC}"
else
  echo -e "${RED}❌ Failed to fetch subscriptions${NC}"
  echo "Make sure you're logged into YouTube in $BROWSER"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Extract unique channels with thumbnails
CHANNELS_FILE="$TEMP_DIR/channels.txt"
jq -r '.entries[]? | select(.channel_id != null) | .channel_id + "|" + .channel + "|" + (.thumbnails[0].url // "")' "$SUBS_FILE" 2>/dev/null | sort -u > "$CHANNELS_FILE" || true

# Also try to extract from other formats
jq -r 'select(.channel_id != null) | .channel_id + "|" + .channel + "|" + (.thumbnails[0].url // "")' "$SUBS_FILE" 2>/dev/null >> "$CHANNELS_FILE" || true

# Remove duplicates
sort -u "$CHANNELS_FILE" -o "$CHANNELS_FILE"

CHANNEL_COUNT=$(wc -l < "$CHANNELS_FILE" | tr -d ' ')
echo -e "${GREEN}✅ Found $CHANNEL_COUNT channels${NC}"

if [ "$CHANNEL_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ No channels found. The subscription fetch might have failed.${NC}"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Step 2: Initialize database with user
echo -e "\n${GREEN}💾 Initializing database...${NC}"
sqlite3 "$DB_PATH" <<EOF
-- Create user if not exists
INSERT OR IGNORE INTO users (id, youtube_user_id, name, email, access_token_encrypted, refresh_token_encrypted)
VALUES (1, 'local-user', 'Local User', 'local@example.com', 'database-mode', 'database-mode');
EOF

# Step 3: Store channels
echo -e "\n${GREEN}📝 Storing channels in database...${NC}"
while IFS='|' read -r channel_id channel_name thumbnail_url; do
  if [ -n "$channel_id" ] && [ -n "$channel_name" ]; then
    # Escape single quotes by doubling them for SQL
    channel_name_escaped=$(echo "$channel_name" | sed "s/'/''/g")
    thumbnail_url_escaped=$(echo "$thumbnail_url" | sed "s/'/''/g")
    sqlite3 "$DB_PATH" <<EOF
INSERT OR REPLACE INTO channels (user_id, youtube_channel_id, channel_name, thumbnail_url, enabled)
VALUES (1, '$channel_id', '$channel_name_escaped', '$thumbnail_url_escaped', 1);
EOF
  fi
done < "$CHANNELS_FILE"

# Step 4: Fetch videos for each channel
echo -e "\n${GREEN}📹 Fetching videos for each channel...${NC}"
echo "(This will take a while...)"

TOTAL_VIDEOS=0
CURRENT_CHANNEL=0

while IFS='|' read -r channel_id channel_name thumbnail_url; do
  if [ -n "$channel_id" ]; then
    CURRENT_CHANNEL=$((CURRENT_CHANNEL + 1))
    echo -e "\n[${CURRENT_CHANNEL}/${CHANNEL_COUNT}] Fetching videos for: $channel_name"
    
    VIDEOS_FILE="$TEMP_DIR/videos_${channel_id}.json"
    
    # Fetch videos with error handling
    # First try with channel URL, then fallback to @handle format
    if yt-dlp --cookies-from-browser "$BROWSER" \
             --dump-json \
             --flat-playlist \
             --playlist-end "$VIDEOS_PER_CHANNEL" \
             -q \
             "https://www.youtube.com/channel/${channel_id}/videos" > "$VIDEOS_FILE" 2>/dev/null || \
       yt-dlp --cookies-from-browser "$BROWSER" \
             --dump-json \
             --flat-playlist \
             --playlist-end "$VIDEOS_PER_CHANNEL" \
             -q \
             "https://www.youtube.com/@${channel_id}/videos" > "$VIDEOS_FILE" 2>/dev/null; then
      
      # Process each video
      VIDEO_COUNT=0
      while read -r video_json; do
        # Extract video data
        video_id=$(echo "$video_json" | jq -r '.id // empty')
        title=$(echo "$video_json" | jq -r '.title // empty')
        duration=$(echo "$video_json" | jq -r '.duration // 0')
        upload_date=$(echo "$video_json" | jq -r '.upload_date // empty')
        view_count=$(echo "$video_json" | jq -r '.view_count // 0')
        thumbnail=$(echo "$video_json" | jq -r '.thumbnails[0].url // empty')
        
        if [ -n "$video_id" ] && [ -n "$title" ] && [ "$duration" -gt 0 ]; then
          # Escape single quotes by doubling them for SQL
          title_escaped=$(echo "$title" | sed "s/'/''/g")
          
          # Convert upload_date from YYYYMMDD to ISO format
          if [ -n "$upload_date" ] && [ ${#upload_date} -eq 8 ]; then
            iso_date="${upload_date:0:4}-${upload_date:4:2}-${upload_date:6:2}T00:00:00Z"
          else
            iso_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
          fi
          
          # Insert into database
          sqlite3 "$DB_PATH" <<EOF
INSERT OR REPLACE INTO video_cache 
(video_id, title, duration, thumbnail_url, published_at, view_count, channel_id, cached_at)
VALUES ('$video_id', '$title_escaped', $duration, '$thumbnail', '$iso_date', $view_count, '$channel_id', CURRENT_TIMESTAMP);
EOF
          VIDEO_COUNT=$((VIDEO_COUNT + 1))
          TOTAL_VIDEOS=$((TOTAL_VIDEOS + 1))
        fi
      done < <(jq -c '.entries[]? // empty' "$VIDEOS_FILE" 2>/dev/null || jq -c '. // empty' "$VIDEOS_FILE" 2>/dev/null)
      
      echo -e "  ${GREEN}✓ Stored $VIDEO_COUNT videos${NC}"
    else
      echo -e "  ${YELLOW}⚠️  Failed to fetch videos${NC}"
    fi
    
    # Be respectful to YouTube
    sleep 1
  fi
done < "$CHANNELS_FILE"

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "\n${GREEN}✨ Database population complete!${NC}"
echo -e "📊 Total videos stored: $TOTAL_VIDEOS"
echo -e "\nYou can now run the app without YouTube API keys:"
echo -e "  ${GREEN}cd api && npm run dev${NC}"
echo -e "  ${GREEN}cd frontend && npm run dev${NC}"