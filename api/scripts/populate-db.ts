#!/usr/bin/env node
import { execSync } from 'child_process';
import { getDb } from '../src/services/database';
import * as fs from 'fs';
import * as path from 'path';

interface Channel {
  id: string;
  title: string;
  uploader: string;
  uploader_id: string;
  thumbnail?: string;
}

interface Video {
  id: string;
  title: string;
  duration: number;
  upload_date: string;
  view_count: number;
  thumbnail: string;
  channel_id: string;
}

class DatabasePopulator {
  private browser: string;
  private userId: number = 1;

  constructor(browser: string = 'chrome') {
    this.browser = browser;
  }

  async run() {
    console.log('🚀 Starting YouTube TV Database Population');
    console.log(`📊 Using browser: ${this.browser}`);
    
    try {
      // Check if yt-dlp is installed
      this.checkYtDlp();
      
      // Initialize database
      await this.initDatabase();
      
      // Fetch subscriptions
      console.log('\n📺 Fetching your YouTube subscriptions...');
      const channels = await this.fetchSubscriptions();
      console.log(`✅ Found ${channels.length} channels`);
      
      // Store channels in database
      await this.storeChannels(channels);
      
      // Fetch videos for each channel
      console.log('\n📹 Fetching videos for each channel...');
      await this.fetchAndStoreVideos(channels);
      
      console.log('\n✨ Database population complete!');
      console.log('You can now run the app without YouTube API keys.');
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  }

  private checkYtDlp() {
    try {
      execSync('yt-dlp --version', { stdio: 'ignore' });
    } catch (error) {
      console.error('❌ yt-dlp is not installed!');
      console.error('Please install it first:');
      console.error('  macOS: brew install yt-dlp');
      console.error('  Windows: pip install yt-dlp');
      console.error('  Linux: sudo apt install yt-dlp');
      process.exit(1);
    }
  }

  private async initDatabase() {
    const db = await getDb();
    
    // Check if user exists, if not create one
    const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [this.userId]);
    
    if (!existingUser) {
      console.log('Creating default user...');
      await db.run(
        `INSERT INTO users (id, youtube_user_id, name, email, access_token_encrypted, refresh_token_encrypted)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          this.userId,
          'local-user',
          'Local User',
          'local@example.com',
          'database-mode',
          'database-mode'
        ]
      );
    }
  }

  private async fetchSubscriptions(): Promise<Channel[]> {
    try {
      // First try to get subscriptions from the channels page
      const channelsUrl = 'https://www.youtube.com/feed/channels';
      const command = `yt-dlp --cookies-from-browser ${this.browser} --dump-json "${channelsUrl}" --flat-playlist -q`;
      
      console.log('Fetching subscriptions (this may take a moment)...');
      const output = execSync(command, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
      
      const channels: Channel[] = [];
      const lines = output.trim().split('\n');
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.entries) {
            // This is the playlist data
            for (const entry of data.entries) {
              if (entry.channel_id && entry.channel) {
                channels.push({
                  id: entry.channel_id,
                  title: entry.channel,
                  uploader: entry.channel,
                  uploader_id: entry.channel_id,
                  thumbnail: entry.thumbnails?.[0]?.url
                });
              }
            }
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
      
      // Remove duplicates
      const uniqueChannels = Array.from(new Map(channels.map(c => [c.id, c])).values());
      
      return uniqueChannels;
    } catch (error) {
      console.error('Failed to fetch subscriptions. Make sure you are logged into YouTube in your browser.');
      throw error;
    }
  }

  private async storeChannels(channels: Channel[]) {
    const db = await getDb();
    
    console.log('Storing channels in database...');
    
    for (const channel of channels) {
      await db.run(
        `INSERT OR REPLACE INTO channels (user_id, youtube_channel_id, channel_name, thumbnail_url, enabled)
         VALUES (?, ?, ?, ?, ?)`,
        [this.userId, channel.id, channel.title, channel.thumbnail || '', 1]
      );
    }
    
    // Also store in subscription cache
    await db.run(
      `INSERT OR REPLACE INTO subscription_cache (user_id, channel_data, cached_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [this.userId, JSON.stringify(channels)]
    );
  }

  private async fetchAndStoreVideos(channels: Channel[]) {
    const db = await getDb();
    let totalVideos = 0;
    
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      console.log(`\n[${i + 1}/${channels.length}] Fetching videos for ${channel.title}...`);
      
      try {
        // Fetch latest 50 videos from channel
        const channelUrl = `https://www.youtube.com/channel/${channel.id}/videos`;
        const command = `yt-dlp --cookies-from-browser ${this.browser} --dump-json "${channelUrl}" --flat-playlist --playlist-end 50 -q`;
        
        const output = execSync(command, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
        const lines = output.trim().split('\n');
        
        let channelVideos = 0;
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.entries) {
              // This is the playlist data with video entries
              for (const entry of data.entries) {
                if (entry.id && entry.title && entry.duration) {
                  await this.storeVideo({
                    id: entry.id,
                    title: entry.title,
                    duration: entry.duration || 0,
                    upload_date: entry.upload_date || new Date().toISOString().split('T')[0].replace(/-/g, ''),
                    view_count: entry.view_count || 0,
                    thumbnail: entry.thumbnails?.[0]?.url || '',
                    channel_id: channel.id
                  });
                  channelVideos++;
                  totalVideos++;
                }
              }
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
        
        console.log(`  ✓ Stored ${channelVideos} videos`);
        
        // Add a small delay to be respectful to YouTube
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ⚠️  Failed to fetch videos for ${channel.title}`);
      }
    }
    
    console.log(`\n✅ Total videos stored: ${totalVideos}`);
  }

  private async storeVideo(video: Video) {
    const db = await getDb();
    
    // Convert upload_date from YYYYMMDD to ISO format
    const year = video.upload_date.substring(0, 4);
    const month = video.upload_date.substring(4, 6);
    const day = video.upload_date.substring(6, 8);
    const isoDate = `${year}-${month}-${day}T00:00:00Z`;
    
    await db.run(
      `INSERT OR REPLACE INTO video_cache 
       (video_id, title, duration, thumbnail_url, published_at, view_count, channel_id, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        video.id,
        video.title,
        video.duration,
        video.thumbnail,
        isoDate,
        video.view_count,
        video.channel_id
      ]
    );
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const browser = args[0] || 'chrome';

if (!['chrome', 'firefox', 'safari', 'edge'].includes(browser)) {
  console.error('❌ Invalid browser. Supported browsers: chrome, firefox, safari, edge');
  process.exit(1);
}

// Run the populator
const populator = new DatabasePopulator(browser);
populator.run();