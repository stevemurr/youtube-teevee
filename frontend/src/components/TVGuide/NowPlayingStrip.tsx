import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2, X } from 'lucide-react';
import { ChannelAvatar } from '../UI';
import { useTVStore } from '../../store/useTVStore';
import { timeStringToSeconds, dateToSeconds } from '../../utils/time';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const NowPlayingStrip: React.FC = () => {
  const navigate = useNavigate();
  const { channels, timeline, currentChannelId, currentTime, setPlayerLayout } = useTVStore();

  const channel = channels.find(c => c.youtube_channel_id === currentChannelId);
  const programs = currentChannelId ? (timeline[currentChannelId] ?? []) : [];
  const nowSeconds = dateToSeconds(currentTime);

  const current = programs.find(p => {
    const start = timeStringToSeconds(p.startTime);
    const end = timeStringToSeconds(p.endTime);
    return nowSeconds >= start && nowSeconds < end;
  });

  const elapsed = current ? nowSeconds - timeStringToSeconds(current.startTime) : 0;
  const progress = current && current.duration > 0 ? (elapsed / current.duration) * 100 : 0;

  const handleExpand = () => {
    setPlayerLayout('fullscreen');
    navigate('/watch');
  };

  const handleClose = () => {
    setPlayerLayout('hidden');
  };

  if (!channel) return null;

  return (
    // h-20 = 80px, sticky below the h-16 (64px) header
    // pr-[142px] reserves space for the GlobalVideoPlayer overlay (142x80)
    <div className="sticky top-16 z-30 h-20 bg-gray-950 border-b border-white/10 flex items-center pr-[142px]">

      {/* Channel + show info — clickable → fullscreen */}
      <div
        className="flex-1 flex items-center gap-3 px-4 min-w-0 cursor-pointer"
        onClick={handleExpand}
      >
        <ChannelAvatar
          thumbnailUrl={channel.thumbnail_url}
          channelName={channel.channel_name}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">
            Now Playing
          </div>
          <div className="text-sm font-medium text-white truncate leading-tight">
            {channel.channel_name}
          </div>
          {current && (
            <div className="text-xs text-gray-400 truncate leading-tight">{current.title}</div>
          )}
        </div>

        {/* Progress */}
        {current && (
          <div className="flex-shrink-0 w-28 hidden sm:block">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-gray-500 text-[10px] mt-1 text-right tabular-nums">
              {formatDuration(elapsed)} / {formatDuration(current.duration)}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 px-2 flex-shrink-0">
        <button
          onClick={handleExpand}
          title="Fullscreen"
          className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleClose}
          title="Close"
          className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
