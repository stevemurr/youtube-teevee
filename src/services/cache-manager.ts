import { getDb } from './database';

interface Timeline {
  [channelId: string]: Array<{
    startTime: string;
    endTime: string;
    videoId: string;
    title: string;
    duration: number;
    type: 'video' | 'intermission';
  }>;
}

interface VideoMetadata {
  videoId: string;
  title: string;
  duration: number;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  channelId: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly TTL_MINUTES = 15;

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.TTL_MINUTES * 60 * 1000;
  }

  private cleanExpired() {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry.timestamp)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async getTimeline(userId: string, date: string): Promise<Timeline | null> {
    const key = `timeline:${userId}:${date}`;

    const cached = this.memoryCache.get(key);
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data;
    }

    const db = getDb();
    const result = db.query(
      'SELECT timeline_data FROM timelines WHERE user_id = ? AND date = ?'
    ).get(userId, date) as any;

    if (result) {
      try {
        const timeline = JSON.parse(result.timeline_data);
        this.memoryCache.set(key, { data: timeline, timestamp: Date.now() });
        return timeline;
      } catch {
        return null;
      }
    }

    return null;
  }

  async setTimeline(userId: string, date: string, timeline: Timeline): Promise<void> {
    const db = getDb();

    db.query(
      'INSERT OR REPLACE INTO timelines (user_id, date, timeline_data, generated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(userId, date, JSON.stringify(timeline));

    const key = `timeline:${userId}:${date}`;
    this.memoryCache.set(key, { data: timeline, timestamp: Date.now() });
  }

  async getVideo(videoId: string): Promise<VideoMetadata | null> {
    const key = `video:${videoId}`;

    const cached = this.memoryCache.get(key);
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data;
    }

    const db = getDb();
    const result = db.query(
      'SELECT * FROM video_cache WHERE video_id = ?'
    ).get(videoId) as any;

    if (result) {
      const video: VideoMetadata = {
        videoId: result.video_id,
        title: result.title,
        duration: result.duration,
        thumbnailUrl: result.thumbnail_url,
        publishedAt: result.published_at,
        viewCount: result.view_count,
        channelId: result.channel_id
      };
      this.memoryCache.set(key, { data: video, timestamp: Date.now() });
      return video;
    }

    return null;
  }

  async setVideo(video: VideoMetadata): Promise<void> {
    const db = getDb();

    db.query(
      `INSERT OR REPLACE INTO video_cache
       (video_id, title, duration, thumbnail_url, published_at, view_count, channel_id, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(
      video.videoId, video.title, video.duration, video.thumbnailUrl,
      video.publishedAt, video.viewCount, video.channelId
    );

    const key = `video:${video.videoId}`;
    this.memoryCache.set(key, { data: video, timestamp: Date.now() });
  }

  async getSubscriptions(userId: string): Promise<any[] | null> {
    const key = `subscriptions:${userId}`;

    const cached = this.memoryCache.get(key);
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data;
    }

    const db = getDb();
    const result = db.query(
      'SELECT channel_data FROM subscription_cache WHERE user_id = ? ORDER BY cached_at DESC LIMIT 1'
    ).get(userId) as any;

    if (result) {
      try {
        const subscriptions = JSON.parse(result.channel_data);
        this.memoryCache.set(key, { data: subscriptions, timestamp: Date.now() });
        return subscriptions;
      } catch {
        return null;
      }
    }

    return null;
  }

  async setSubscriptions(userId: string, subscriptions: any[]): Promise<void> {
    const db = getDb();

    db.query(
      'INSERT INTO subscription_cache (user_id, channel_data, cached_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
    ).run(userId, JSON.stringify(subscriptions));

    const key = `subscriptions:${userId}`;
    this.memoryCache.set(key, { data: subscriptions, timestamp: Date.now() });
  }

  async getChannelVideos(channelId: string): Promise<any[] | null> {
    const key = `channel_videos:${channelId}`;

    const cached = this.memoryCache.get(key);
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data;
    }

    const db = getDb();
    const results = db.query(
      'SELECT * FROM video_cache WHERE channel_id = ? ORDER BY published_at DESC'
    ).all(channelId) as any[];

    if (results && results.length > 0) {
      const videos = results.map(result => ({
        videoId: result.video_id,
        title: result.title,
        duration: result.duration,
        thumbnailUrl: result.thumbnail_url,
        publishedAt: result.published_at,
        viewCount: result.view_count,
        channelId: result.channel_id
      }));
      this.memoryCache.set(key, { data: videos, timestamp: Date.now() });
      return videos;
    }

    return null;
  }

  async setChannelVideos(channelId: string, videos: any[]): Promise<void> {
    const db = getDb();

    for (const video of videos) {
      db.query(
        `INSERT OR REPLACE INTO video_cache
         (video_id, title, duration, thumbnail_url, published_at, view_count, channel_id, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).run(
        video.videoId, video.title, video.duration, video.thumbnailUrl,
        video.publishedAt, video.viewCount, channelId
      );
    }

    const key = `channel_videos:${channelId}`;
    this.memoryCache.set(key, { data: videos, timestamp: Date.now() });
  }

  clearCache(): void {
    this.memoryCache.clear();
  }

  startCleanupInterval(): void {
    setInterval(() => {
      this.cleanExpired();
    }, 5 * 60 * 1000);
  }
}

export const cacheManager = new CacheManager();
cacheManager.startCleanupInterval();
