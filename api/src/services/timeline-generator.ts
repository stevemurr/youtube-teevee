import { cacheManager } from './cache-manager';
import { getDb } from './database';

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
  private readonly DAY_SECONDS = 86400; // 24 hours
  private readonly PRIME_TIME_START = 20 * 3600; // 8 PM in seconds
  private readonly PRIME_TIME_END = 22 * 3600; // 10 PM in seconds

  async generateTimeline(userId: string, date: string, settings: UserSettings = {}, forceRefresh: boolean = false): Promise<Timeline> {
    // Check if timeline already exists for this date (unless force refresh)
    if (!forceRefresh) {
      const existing = await cacheManager.getTimeline(userId, date);
      if (existing) return existing;
    }

    // Get user's enabled channels
    const db = await getDb();

    const channels = await db.all(
      'SELECT * FROM channels WHERE user_id = ? AND enabled = 1',
      [userId]
    );

    if (channels.length === 0) {
      throw new Error('No enabled channels found');
    }

    const timeline: Timeline = {};

    // Generate timeline for each channel
    for (const channel of channels) {
      const channelTimeline = await this.generateChannelTimeline(
        channel.youtube_channel_id,
        settings,
        forceRefresh
      );
      timeline[channel.youtube_channel_id] = channelTimeline;
    }

    // Save timeline to cache and database
    await cacheManager.setTimeline(userId, date, timeline);

    return timeline;
  }

  private async generateChannelTimeline(
    channelId: string,
    settings: UserSettings,
    _forceRefresh: boolean = false
  ): Promise<ProgramSlot[]> {
    try {
      // Fetch videos directly from database
      const db = await getDb();
      const dbVideos = await db.all(
        `SELECT * FROM video_cache 
         WHERE channel_id = ? 
         ORDER BY published_at DESC 
         LIMIT 200`,
        [channelId]
      );
      
      // Convert to expected format
      const videos = dbVideos.map(video => ({
        videoId: video.video_id,
        title: video.title,
        duration: video.duration,
        thumbnailUrl: video.thumbnail_url,
        publishedAt: video.published_at,
        viewCount: video.view_count,
        channelId: video.channel_id
      }));
      
      console.log(`Found ${videos.length} videos for channel ${channelId}`);
      
      // Filter videos based on settings
      const filteredVideos = this.filterVideos(videos, settings);
      
      if (filteredVideos.length === 0) {
        return this.generateOffAirTimeline();
      }

      // Categorize videos
      const recentVideos = this.getRecentVideos(filteredVideos);
      const popularVideos = this.getPopularVideos(filteredVideos);
      const regularVideos = filteredVideos;

      // Generate 24-hour timeline
      const timeline: ProgramSlot[] = [];
      let currentTime = 0; // Start at midnight

      while (currentTime < this.DAY_SECONDS) {
        const isPrimeTime = currentTime >= this.PRIME_TIME_START && currentTime <= this.PRIME_TIME_END;
        
        // Select video based on time slot
        const video = this.selectVideo(
          isPrimeTime,
          recentVideos,
          popularVideos,
          regularVideos
        );

        // Add video to timeline
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

        // Video metadata is already in database, no need to cache
      }

      return timeline;
    } catch (error) {
      console.error(`Error generating timeline for channel ${channelId}:`, error);
      return this.generateOffAirTimeline();
    }
  }

  private filterVideos(videos: any[], settings: UserSettings): any[] {
    return videos.filter(video => {
      // Filter out videos 3 minutes (180 seconds) or less
      if (video.duration <= 180) {
        return false;
      }

      // Filter by max duration
      if (settings.maxVideoDuration && video.duration > settings.maxVideoDuration) {
        return false;
      }

      // Default: exclude videos longer than 2 hours
      if (!settings.maxVideoDuration && video.duration > 7200) {
        return false;
      }

      // TODO: Add logic to filter livestreams when API provides this info

      return true;
    });
  }

  private getRecentVideos(videos: any[]): any[] {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return videos.filter(video => {
      const publishedDate = new Date(video.publishedAt);
      return publishedDate >= oneWeekAgo;
    });
  }

  private getPopularVideos(videos: any[]): any[] {
    // Sort by view count and get top 10%
    const sorted = [...videos].sort((a, b) => b.viewCount - a.viewCount);
    const topPercentile = Math.ceil(sorted.length * 0.1);
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
      
      // 70% chance for recent videos during prime time
      if (random < 0.7 && recentVideos.length > 0) {
        return this.randomVideo(recentVideos);
      }
      // 30% chance for popular videos
      else if (popularVideos.length > 0) {
        return this.randomVideo(popularVideos);
      }
    }

    // Default to random selection from all videos
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
    // Use today's date for timeline lookup
    const date = new Date().toISOString().split('T')[0];
    let timeline = await cacheManager.getTimeline(userId, date);

    console.log(`[Timeline] Looking up program at ${currentSeconds}s (${this.secondsToTimeString(currentSeconds)}) for channel ${channelId}`);

    // If timeline doesn't exist, generate it
    if (!timeline) {
      const db = await getDb();
      const user = await db.get('SELECT settings FROM users WHERE id = ?', [userId]);
      timeline = await this.generateTimeline(userId, date, user?.settings || {});
    }

    if (!timeline[channelId]) {
      console.log(`[Timeline] No timeline found for channel ${channelId}`);
      return { program: null, elapsed: 0 };
    }

    const channelTimeline = timeline[channelId];

    for (const program of channelTimeline) {
      const startSeconds = this.timeStringToSeconds(program.startTime);
      const endSeconds = this.timeStringToSeconds(program.endTime);

      if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
        const elapsed = currentSeconds - startSeconds;
        console.log(`[Timeline] Found program: "${program.title}" (${program.startTime} - ${program.endTime}), elapsed: ${elapsed}s`);
        return { program, elapsed };
      }
    }

    console.log(`[Timeline] No program found at ${currentSeconds}s`);
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