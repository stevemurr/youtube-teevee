# YouTube TV Guide

Transform your YouTube subscriptions into a traditional TV experience! This app creates a synchronized timeline-based programming schedule across all your subscribed channels - just like classic TV.

![YouTube TV Guide Demo](demo.png)

## Features

- 📺 **TV-Style Guide**: Browse your subscriptions in a familiar TV guide grid layout
- ⏰ **Synchronized Timeline**: All channels play on the same global clock
- 🎲 **Random Programming**: Videos are scheduled throughout the day like TV shows
- 🌟 **Prime Time Scheduling**: Recent and popular videos get priority during peak hours
- 🚫 **No Time Controls**: Experience the nostalgia of not being able to skip or rewind
- 💾 **Offline Operation**: All data stored locally, no API calls during use

## How It Works

This app uses `yt-dlp` to fetch your YouTube subscriptions and video metadata from your browser cookies. No YouTube API keys required!

## Prerequisites

1. **yt-dlp** - For fetching YouTube data
   - macOS: `brew install yt-dlp`
   - Windows/Linux: `pip install yt-dlp`

2. **jq** - For JSON processing
   - macOS: `brew install jq`
   - Ubuntu/Debian: `sudo apt install jq`

3. **Node.js 18+** and **npm**

4. **Logged into YouTube** in Chrome, Firefox, Safari, or Edge

## Quick Start

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/youtube-teevee.git
   cd youtube-teevee
   
   # Install dependencies
   cd api && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

2. **Populate Your Database**
   ```bash
   # Uses Chrome by default
   ./populate-db.sh
   
   # Or specify browser
   ./populate-db.sh --browser firefox
   ```

3. **Start the App**
   ```bash
   # Terminal 1
   cd api && npm run dev
   
   # Terminal 2  
   cd frontend && npm run dev
   ```

4. **Open** http://localhost:5173

## Usage

### First Time Setup
1. Run the populate-db script (takes 10-20 minutes depending on subscriptions)
2. The script will:
   - Fetch your YouTube subscriptions from browser cookies
   - Download metadata for recent videos from each channel
   - Create a local database with all the information

### Daily Use
- The app auto-logins and shows your TV guide
- Navigate channels with up/down arrows
- Videos play at their scheduled times
- Use Settings to rebuild the timeline with fresh programming

### Updating Content
```bash
# Re-run to get new videos
./populate-db.sh
```

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + SQLite
- **Data Source**: yt-dlp with browser cookies
- **No External APIs**: Runs completely offline after setup

## Privacy & Security

- ✅ All data stored locally on your machine
- ✅ No external API calls during use
- ✅ YouTube credentials never stored
- ✅ Only public video metadata collected
- ✅ Browser cookies only used by yt-dlp

## Limitations

- 📹 No actual video playback (would require YouTube API)
- 🔄 Manual updates via populate-db script
- 📱 Desktop only (mobile browsers not supported by yt-dlp)

## Troubleshooting

### "Failed to fetch subscriptions"
- Ensure you're logged into YouTube in your browser
- Try a different browser: `./populate-db.sh --browser firefox`

### Database Issues
```bash
# Start fresh
rm api/database/app.db
cd api && npm run db:create && cd ..
./populate-db.sh
```

## Contributing

Pull requests welcome! Some ideas:
- Mobile support
- Better timeline algorithms  
- Channel categories
- Favorite shows scheduling

## License

MIT