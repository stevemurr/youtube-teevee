import { exec } from 'child_process';
import { promisify } from 'util';
import { getDb } from './database';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

const execAsync = promisify(exec);

export interface RefreshProgress {
  status: 'idle' | 'starting' | 'fetching_subscriptions' | 'fetching_channels' | 'fetching_videos' | 'completed' | 'error';
  message: string;
  currentChannel?: number;
  totalChannels?: number;
  currentChannelName?: string;
  newVideos?: number;
  totalVideos?: number;
  error?: string;
}

export class DataRefreshService extends EventEmitter {
  private isRunning = false;
  private browser: string = 'chrome';
  private videosPerChannel: number = 50;
  private progress: RefreshProgress = {
    status: 'idle',
    message: 'Ready to refresh data'
  };

  constructor() {
    super();
  }

  getProgress(): RefreshProgress {
    return this.progress;
  }

  isRefreshing(): boolean {
    return this.isRunning;
  }

  private updateProgress(progress: Partial<RefreshProgress>) {
    this.progress = { ...this.progress, ...progress };
    this.emit('progress', this.progress);
  }

  async startRefresh(browser: string = 'chrome', videosPerChannel: number = 50): Promise<void> {
    if (this.isRunning) {
      throw new Error('Refresh already in progress');
    }

    this.isRunning = true;
    this.browser = browser;
    this.videosPerChannel = videosPerChannel;

    try {
      await this.checkYtDlp();
      await this.refreshData();
    } catch (error: any) {
      this.updateProgress({
        status: 'error',
        message: 'Refresh failed',
        error: error.message
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async checkYtDlp(): Promise<void> {
    try {
      await execAsync('yt-dlp --version');
    } catch (error) {
      throw new Error('yt-dlp is not installed. Please install it first.');
    }
  }

  private async refreshData(): Promise<void> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'youtube-tv-'));
    
    try {
      // Step 1: Fetch subscriptions
      this.updateProgress({
        status: 'fetching_subscriptions',
        message: 'Fetching your YouTube subscriptions...'
      });

      const subscriptions = await this.fetchSubscriptions(tempDir);
      
      if (subscriptions.length === 0) {
        throw new Error('No subscriptions found. Make sure you are logged into YouTube in ' + this.browser);
      }

      this.updateProgress({
        status: 'fetching_channels',
        message: `Found ${subscriptions.length} channels`,
        totalChannels: subscriptions.length
      });

      // Step 2: Store channels
      await this.storeChannels(subscriptions);

      // Step 3: Fetch videos for each channel
      this.updateProgress({
        status: 'fetching_videos',
        message: 'Fetching videos for each channel...',
        totalVideos: 0,
        newVideos: 0
      });

      for (let i = 0; i < subscriptions.length; i++) {
        const channel = subscriptions[i];
        this.updateProgress({
          currentChannel: i + 1,
          currentChannelName: channel.name,
          message: `Processing ${channel.name} (${i + 1}/${subscriptions.length})`
        });

        try {
          const newVideos = await this.fetchChannelVideos(channel, tempDir);
          this.updateProgress({
            newVideos: (this.progress.newVideos || 0) + newVideos,
            totalVideos: (this.progress.totalVideos || 0) + newVideos
          });
        } catch (error) {
          console.error(`Failed to fetch videos for ${channel.name}:`, error);
        }

        // Small delay between channels
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.updateProgress({
        status: 'completed',
        message: `Refresh completed! Added ${this.progress.newVideos} new videos.`
      });

    } finally {
      // Cleanup temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to cleanup temp directory:', error);
      }
    }
  }

  private async fetchSubscriptions(tempDir: string): Promise<Array<{id: string, name: string, thumbnail: string}>> {
    const subsFile = path.join(tempDir, 'subscriptions.txt');
    
    try {
      // Use the same approach as populate-db-v2.sh
      await execAsync(`yt-dlp --cookies-from-browser ${this.browser} --flat-playlist --print channel_id --print channel "https://www.youtube.com/feed/channels" > "${subsFile}"`);
      
      const content = await fs.readFile(subsFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line);
      const channels: Array<{id: string, name: string, thumbnail: string}> = [];
      
      // Process pairs of lines (channel_id, channel_name)
      for (let i = 0; i < lines.length; i += 2) {
        if (i + 1 < lines.length) {
          const channelId = lines[i].trim();
          const channelName = lines[i + 1].trim();
          
          if (channelId && channelName && channelId.startsWith('UC')) {
            channels.push({
              id: channelId,
              name: channelName,
              thumbnail: ''  // Will be fetched from channel page
            });
          }
        }
      }
      
      // Remove duplicates
      const uniqueChannels = Array.from(new Map(channels.map(c => [c.id, c])).values());
      
      if (uniqueChannels.length === 0) {
        throw new Error('No subscriptions found. Make sure you are logged into YouTube in ' + this.browser);
      }
      
      return uniqueChannels;
      
    } catch (error: any) {
      console.error('Subscription fetch error:', error);
      throw new Error(error.message || 'Failed to fetch subscriptions');
    }
  }

  private async storeChannels(channels: Array<{id: string, name: string, thumbnail: string}>): Promise<void> {
    const db = await getDb();
    
    for (const channel of channels) {
      // Try to get thumbnail from channel page
      let thumbnailUrl = '';
      try {
        const { stdout } = await execAsync(
          `yt-dlp --cookies-from-browser ${this.browser} --print channel_url "https://www.youtube.com/channel/${channel.id}" 2>/dev/null | head -1 | xargs -I {} yt-dlp --cookies-from-browser ${this.browser} --print thumbnail {} 2>/dev/null | head -1`
        );
        thumbnailUrl = stdout.trim();
        
        // Fix thumbnail URL if needed
        if (thumbnailUrl && thumbnailUrl.includes('//')) {
          const index = thumbnailUrl.indexOf('//');
          thumbnailUrl = 'https:' + thumbnailUrl.substring(index);
        }
      } catch (error) {
        console.error(`Failed to fetch thumbnail for ${channel.name}`);
      }

      await db.run(
        `INSERT OR REPLACE INTO channels (user_id, youtube_channel_id, channel_name, thumbnail_url, enabled)
         VALUES (?, ?, ?, ?, ?)`,
        [1, channel.id, channel.name, thumbnailUrl, 1]
      );
    }
  }

  private async fetchChannelVideos(channel: {id: string, name: string}, tempDir: string): Promise<number> {
    const db = await getDb();
    
    // Check existing video count
    const existingCount = await db.get(
      'SELECT COUNT(*) as count FROM video_cache WHERE channel_id = ?',
      [channel.id]
    );

    // Fetch video list
    const videosFile = path.join(tempDir, `videos_${channel.id}.json`);
    const command = `yt-dlp --cookies-from-browser ${this.browser} --flat-playlist --playlist-end ${this.videosPerChannel} --print-json -q "https://www.youtube.com/channel/${channel.id}/videos" > "${videosFile}"`;

    try {
      await execAsync(command);
    } catch (error) {
      console.error(`Failed to fetch video list for ${channel.name}`);
      return 0;
    }

    // Parse video list and fetch details for new videos
    const content = await fs.readFile(videosFile, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line);
    let newVideos = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const videoId = entry.id || (entry.url ? entry.url.split('v=')[1] : null);
        
        if (!videoId) continue;

        // Check if video already exists
        const exists = await db.get(
          'SELECT COUNT(*) as count FROM video_cache WHERE video_id = ?',
          [videoId]
        );

        if (exists.count === 0) {
          // Fetch full video details
          const details = await this.fetchVideoDetails(videoId);
          if (details) {
            await this.storeVideo(details, channel.id);
            newVideos++;
          }
        }
      } catch (error) {
        // Skip invalid entries
      }
    }

    return newVideos;
  }

  private async fetchVideoDetails(videoId: string): Promise<any> {
    try {
      const { stdout } = await execAsync(
        `yt-dlp --cookies-from-browser ${this.browser} --dump-json -q "https://www.youtube.com/watch?v=${videoId}"`
      );
      return JSON.parse(stdout);
    } catch (error) {
      console.error(`Failed to fetch details for video ${videoId}`);
      return null;
    }
  }

  private async storeVideo(video: any, channelId: string): Promise<void> {
    const db = await getDb();
    
    // Parse the upload date
    let publishedAt: string;
    if (video.upload_date && video.upload_date.length === 8) {
      const year = video.upload_date.substring(0, 4);
      const month = video.upload_date.substring(4, 6);
      const day = video.upload_date.substring(6, 8);
      publishedAt = `${year}-${month}-${day}T00:00:00Z`;
    } else {
      publishedAt = new Date().toISOString();
    }

    await db.run(
      `INSERT OR REPLACE INTO video_cache 
       (video_id, title, duration, thumbnail_url, published_at, view_count, channel_id, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        video.id,
        video.title || 'Unknown Title',
        video.duration || 0,
        video.thumbnail || '',
        publishedAt,
        video.view_count || 0,
        channelId
      ]
    );
  }
}

// Singleton instance
export const dataRefreshService = new DataRefreshService();