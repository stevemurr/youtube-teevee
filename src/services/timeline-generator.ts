import { cacheManager } from './cache-manager';
import { getDb } from './database';
import { logger } from '../utils/logger';

interface ProgramSlot {
  startTime: string;
  endTime: string;
  videoId: string;
  title: string;
  duration: number;
  type: 'video' | 'intermission';
}

interface Timeline {
  [channelId: string]: ProgramSlot[];
}

interface UserSettings {
  excludeShorts?: boolean;
  excludeLivestreams?: boolean;
  maxVideoDuration?: number; // in seconds
}

export class TimelineGenerator {
  private readonly DAY_SECONDS = 86400;
  private readonly PRIME_TIME_START = 20 * 3600;
  private readonly PRIME_TIME_END = 22 * 3600;
  private readonly MIN_VIDEO_DURATION = 180;   // 3 minutes
  private readonly MAX_VIDEO_DURATION = 7200;  // 2 hours
  private readonly RECENT_DAYS = 7;
  private readonly PRIME_TIME_RECENT_RATIO = 0.7;
  private readonly POPULAR_PERCENTILE = 0.1;

  async generateTimeline(userId: string, date: string, settings: UserSettings = {}, forceRefresh: boolean = false): Promise<Timeline> {
    if (!forceRefresh) {
      const existing = await cacheManager.getTimeline(userId, date);
      if (existing) return existing;
    }

    const db = getDb();
    const channels = db.query(
      'SELECT * FROM channels WHERE user_id = ? AND enabled = 1'
    ).all(userId) as any[];

    if (channels.length === 0) {
      throw new Error('No enabled channels found');
    }

    const timeline: Timeline = {};

    for (const channel of channels) {
      const channelTimeline = await this.generateChannelTimeline(
        channel.youtube_channel_id,
        settings,
        forceRefresh
      );
      timeline[channel.youtube_channel_id] = channelTimeline;
    }

    await cacheManager.setTimeline(userId, date, timeline);

    return timeline;
  }

  private async generateChannelTimeline(
    channelId: string,
    settings: UserSettings,
    _forceRefresh: boolean = false
  ): Promise<ProgramSlot[]> {
    try {
      const db = getDb();
      const dbVideos = db.query(
        `SELECT * FROM video_cache
         WHERE channel_id = ?
         ORDER BY published_at DESC
         LIMIT 200`
      ).all(channelId) as any[];

      const videos = dbVideos.map(video => ({
        videoId: video.video_id,
        title: video.title,
        duration: video.duration,
        thumbnailUrl: video.thumbnail_url,
        publishedAt: video.published_at,
        viewCount: video.view_count,
        channelId: video.channel_id
      }));

      logger.log(`Found ${videos.length} videos for channel ${channelId}`);

      const filteredVideos = this.filterVideos(videos, settings);

      if (filteredVideos.length === 0) {
        return this.generateOffAirTimeline();
      }

      const recentVideos = this.getRecentVideos(filteredVideos);
      const popularVideos = this.getPopularVideos(filteredVideos);
      const regularVideos = filteredVideos;

      const timeline: ProgramSlot[] = [];
      let currentTime = 0;

      while (currentTime < this.DAY_SECONDS) {
        const isPrimeTime = currentTime >= this.PRIME_TIME_START && currentTime <= this.PRIME_TIME_END;

        const video = this.selectVideo(
          isPrimeTime,
          recentVideos,
          popularVideos,
          regularVideos
        );

        const startTime = this.secondsToTimeString(currentTime);
        const endTime = this.secondsToTimeString(currentTime + video.duration);

        timeline.push({
          startTime,
          endTime,
          videoId: video.videoId,
          title: video.title,
          duration: video.duration,
          type: 'video'
        });

        currentTime += video.duration;
      }

      return timeline;
    } catch (error: any) {
      logger.error(`Error generating timeline for channel ${channelId}: ${error?.message || error}`);
      logger.error(error?.stack || '');
      return this.generateOffAirTimeline();
    }
  }

  private filterVideos(videos: any[], settings: UserSettings): any[] {
    return videos.filter(video => {
      if (!video.duration || video.duration <= this.MIN_VIDEO_DURATION) {
        return false;
      }

      if (settings.maxVideoDuration && video.duration > settings.maxVideoDuration) {
        return false;
      }

      if (!settings.maxVideoDuration && video.duration > this.MAX_VIDEO_DURATION) {
        return false;
      }

      return true;
    });
  }

  private getRecentVideos(videos: any[]): any[] {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - this.RECENT_DAYS);

    return videos.filter(video => {
      const publishedDate = new Date(video.publishedAt);
      return publishedDate >= oneWeekAgo;
    });
  }

  private getPopularVideos(videos: any[]): any[] {
    const sorted = [...videos].sort((a, b) => b.viewCount - a.viewCount);
    const topPercentile = Math.ceil(sorted.length * this.POPULAR_PERCENTILE);
    return sorted.slice(0, topPercentile);
  }

  private selectVideo(
    isPrimeTime: boolean,
    recentVideos: any[],
    popularVideos: any[],
    regularVideos: any[]
  ): any {
    if (isPrimeTime) {
      const random = Math.random();

      if (random < this.PRIME_TIME_RECENT_RATIO && recentVideos.length > 0) {
        return this.randomVideo(recentVideos);
      } else if (popularVideos.length > 0) {
        return this.randomVideo(popularVideos);
      }
    }

    return this.randomVideo(regularVideos);
  }

  private randomVideo(videos: any[]): any {
    return videos[Math.floor(Math.random() * videos.length)];
  }

  private secondsToTimeString(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private generateOffAirTimeline(): ProgramSlot[] {
    return [{
      startTime: '00:00:00',
      endTime: '23:59:59',
      videoId: '',
      title: 'Off Air',
      duration: this.DAY_SECONDS,
      type: 'video'
    }];
  }

  async getCurrentProgram(
    userId: string,
    channelId: string,
    currentTime: Date = new Date()
  ): Promise<{ program: ProgramSlot | null; elapsed: number }> {
    const currentSeconds = this.getSecondsFromMidnight(currentTime);
    return this.getCurrentProgramBySeconds(userId, channelId, currentSeconds);
  }

  async getCurrentProgramBySeconds(
    userId: string,
    channelId: string,
    currentSeconds: number
  ): Promise<{ program: ProgramSlot | null; elapsed: number }> {
    const date = new Date().toISOString().split('T')[0];
    let timeline = await cacheManager.getTimeline(userId, date);

    logger.log(`[Timeline] Looking up program at ${currentSeconds}s (${this.secondsToTimeString(currentSeconds)}) for channel ${channelId}`);

    if (!timeline) {
      const db = getDb();
      const user = db.query('SELECT settings FROM users WHERE id = ?').get(userId) as any;
      timeline = await this.generateTimeline(userId, date, user?.settings || {});
    }

    if (!timeline[channelId]) {
      logger.log(`[Timeline] No timeline found for channel ${channelId}`);
      return { program: null, elapsed: 0 };
    }

    const channelTimeline = timeline[channelId];

    for (const program of channelTimeline) {
      const startSeconds = this.timeStringToSeconds(program.startTime);
      const endSeconds = this.timeStringToSeconds(program.endTime);

      if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
        const elapsed = currentSeconds - startSeconds;
        logger.log(`[Timeline] Found program: "${program.title}" (${program.startTime} - ${program.endTime}), elapsed: ${elapsed}s`);
        return { program, elapsed };
      }
    }

    logger.log(`[Timeline] No program found at ${currentSeconds}s`);
    return { program: null, elapsed: 0 };
  }

  private getSecondsFromMidnight(date: Date): number {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return hours * 3600 + minutes * 60 + seconds;
  }

  private timeStringToSeconds(timeString: string): number {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }
}

export const timelineGenerator = new TimelineGenerator();
