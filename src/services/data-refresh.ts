import { $ } from 'bun';
import { getDb } from './database';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface RefreshProgress {
  status: 'idle' | 'starting' | 'fetching_subscriptions' | 'fetching_channels' | 'fetching_videos' | 'fetching_thumbnails' | 'completed' | 'error';
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

  async isSetupComplete(): Promise<{ cookies: boolean; subscriptions: boolean }> {
    const [cookies, subscriptions] = await Promise.all([
      fs.access(config.cookiesPath).then(() => true).catch(() => false),
      fs.access(config.subscriptionsPath).then(() => true).catch(() => false),
    ]);
    return { cookies, subscriptions };
  }

  async startRefresh(videosPerChannel: number = 50): Promise<void> {
    if (this.isRunning) {
      throw new Error('Refresh already in progress');
    }

    const setup = await this.isSetupComplete();
    if (!setup.cookies || !setup.subscriptions) {
      const missing = [
        !setup.cookies && 'cookies.txt',
        !setup.subscriptions && 'subscriptions.json',
      ].filter(Boolean).join(' and ');
      throw new Error(
        `${missing} not found. Run ./scripts/export-cookies.sh on your host machine first.`
      );
    }

    this.isRunning = true;
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
      await $`yt-dlp --version`.quiet();
    } catch {
      throw new Error('yt-dlp is not installed. Please install it first.');
    }
  }

  private async refreshData(): Promise<void> {
    this.updateProgress({
      status: 'fetching_subscriptions',
      message: 'Loading subscriptions from file...'
    });

    const subscriptions = await this.fetchSubscriptions();

    if (subscriptions.length === 0) {
      throw new Error('No subscriptions found. Make sure your cookies.txt is up to date (run ./scripts/export-cookies.sh)');
    }

    this.updateProgress({
      status: 'fetching_channels',
      message: `Found ${subscriptions.length} channels`,
      totalChannels: subscriptions.length
    });

    this.storeChannels(subscriptions);

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
        const newVideos = await this.fetchChannelVideos(channel);
        this.updateProgress({
          newVideos: (this.progress.newVideos || 0) + newVideos,
          totalVideos: (this.progress.totalVideos || 0) + newVideos
        });
      } catch (error) {
        logger.error(`Failed to fetch videos for ${channel.name}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await this.refreshMissingThumbnails();

    this.updateProgress({
      status: 'completed',
      message: `Refresh completed! Added ${this.progress.newVideos} new videos.`
    });
  }

  private async fetchSubscriptions(): Promise<Array<{id: string, name: string, thumbnail: string}>> {
    try {
      const content = await fs.readFile(config.subscriptionsPath, 'utf-8');
      const channels = JSON.parse(content) as Array<{id: string, name: string, thumbnail: string}>;
      if (!Array.isArray(channels) || channels.length === 0) {
        throw new Error('subscriptions.json is empty — re-run ./scripts/export-cookies.sh');
      }
      return channels;
    } catch (error: any) {
      logger.error('Failed to read subscriptions file:', error);
      throw new Error(error.message || 'Failed to read subscriptions.json');
    }
  }

  private storeChannels(channels: Array<{id: string, name: string, thumbnail: string}>): void {
    const db = getDb();
    for (const channel of channels) {
      const thumb = (!channel.thumbnail || channel.thumbnail === 'NA') ? '' : channel.thumbnail;
      db.query(
        `INSERT OR REPLACE INTO channels (user_id, youtube_channel_id, channel_name, thumbnail_url, enabled)
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, channel.id, channel.name, thumb, 1);
    }
  }

  private async fetchChannelVideos(channel: {id: string, name: string}): Promise<number> {
    const db = getDb();
    const channelUrl = `https://www.youtube.com/channel/${channel.id}/videos`;

    // Find the newest video we already have for this channel.
    const row = db.query(
      'SELECT MAX(published_at) as latest FROM video_cache WHERE channel_id = ?'
    ).get(channel.id) as { latest: string | null };

    let output: string;

    if (row?.latest) {
      // Incremental: ask yt-dlp for only videos uploaded after our newest cached date.
      // Subtract one day so same-day videos aren't accidentally skipped.
      const d = new Date(row.latest);
      d.setDate(d.getDate() - 1);
      const dateAfter = d.toISOString().slice(0, 10).replace(/-/g, '');
      output = await $`yt-dlp --cookies ${config.cookiesPath} --flat-playlist --dateafter ${dateAfter} -j -q ${channelUrl}`
        .quiet().nothrow().text();
    } else {
      // First fetch: no history, grab the N most recent videos.
      output = await $`yt-dlp --cookies ${config.cookiesPath} --flat-playlist --playlist-end ${this.videosPerChannel} -j -q ${channelUrl}`
        .quiet().nothrow().text();
    }

    const lines = output.trim().split('\n').filter(l => l.trim() && !l.startsWith('WARNING') && !l.startsWith('ERROR'));
    let newVideos = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const videoId = entry.id;
        if (!videoId) continue;

        const exists = db.query('SELECT 1 FROM video_cache WHERE video_id = ?').get(videoId);
        if (!exists) {
          this.storeVideo(entry, channel.id);
          newVideos++;
        }
      } catch {
        // skip malformed lines
      }
    }

    return newVideos;
  }

  private async refreshMissingThumbnails(): Promise<void> {
    const db = getDb();
    const channels = db.query(
      `SELECT youtube_channel_id, channel_name FROM channels
       WHERE (thumbnail_url IS NULL OR thumbnail_url = '' OR thumbnail_url = 'NA') AND enabled = 1`
    ).all() as any[];

    if (channels.length === 0) return;

    this.updateProgress({
      status: 'fetching_thumbnails',
      message: `Fetching thumbnails for ${channels.length} channels...`,
    });

    const BATCH = 5;
    for (let i = 0; i < channels.length; i += BATCH) {
      const batch = channels.slice(i, i + BATCH);
      await Promise.all(batch.map(ch => this.fetchAndStoreThumbnail(ch.youtube_channel_id)));
      this.updateProgress({
        message: `Fetching thumbnails… ${Math.min(i + BATCH, channels.length)}/${channels.length}`,
      });
    }
  }

  private async fetchAndStoreThumbnail(channelId: string): Promise<void> {
    try {
      const channelUrl = `https://www.youtube.com/channel/${channelId}`;
      const stdout = await $`yt-dlp --cookies ${config.cookiesPath} --flat-playlist --playlist-end 1 -J -q ${channelUrl}`
        .quiet()
        .nothrow()
        .text();

      const data = JSON.parse(stdout.trim());
      const thumbnails: Array<{ url: string; id?: string }> = data.thumbnails || [];

      const avatar =
        thumbnails.find(t => t.id === 'avatar_uncropped') ||
        thumbnails[thumbnails.length - 1];

      if (avatar?.url) {
        const db = getDb();
        db.query(
          'UPDATE channels SET thumbnail_url = ? WHERE youtube_channel_id = ?'
        ).run(avatar.url, channelId);
      }
    } catch {
      // Thumbnail is non-critical; skip silently
    }
  }

  private storeVideo(video: any, channelId: string): void {
    const db = getDb();

    let publishedAt: string;
    const ud = video.upload_date;
    if (ud && ud.length === 8) {
      publishedAt = `${ud.slice(0,4)}-${ud.slice(4,6)}-${ud.slice(6,8)}T00:00:00Z`;
    } else {
      publishedAt = new Date().toISOString();
    }

    const thumbnail: string =
      video.thumbnail ||
      (Array.isArray(video.thumbnails) && video.thumbnails.length
        ? video.thumbnails[video.thumbnails.length - 1]?.url ?? ''
        : '') ||
      `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

    db.query(
      `INSERT OR REPLACE INTO video_cache
       (video_id, title, duration, thumbnail_url, published_at, view_count, channel_id, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(
      video.id,
      video.title || 'Unknown Title',
      video.duration || 0,
      thumbnail,
      publishedAt,
      video.view_count || 0,
      channelId
    );
  }
}

export const dataRefreshService = new DataRefreshService();
