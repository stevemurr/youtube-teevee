export interface Channel {
  id?: number;
  youtube_channel_id: string;
  channel_name: string;
  thumbnail_url: string;
  enabled?: boolean;
}

export interface ProgramSlot {
  startTime: string;
  endTime: string;
  videoId: string;
  title: string;
  duration: number;
  type: 'video' | 'intermission';
}
