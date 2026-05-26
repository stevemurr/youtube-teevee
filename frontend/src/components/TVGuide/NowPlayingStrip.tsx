import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2, X } from 'lucide-react';
import { ChannelAvatar } from '../UI';
import { useTVStore } from '../../store/useTVStore';
import { useVideoPlayer } from '../../contexts/VideoPlayerContext';
import { timeStringToSeconds, dateToSeconds } from '../../utils/time';

// Video card dimensions — must match GlobalVideoPlayer 'strip' layout
const VIDEO_W = 400;
const VIDEO_H = 225;
const CARD_TOP = 80;   // header h-16 (64px) + 16px gap
const CARD_RIGHT = 16; // right margin

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const NowPlayingStrip: React.FC = () => {
  const navigate = useNavigate();
  const { channels, timeline, currentChannelId, currentTime, setPlayerLayout } = useTVStore();
  const { activePlayerRef } = useVideoPlayer();

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
    // Pause the player before hiding so audio stops
    try {
      activePlayerRef.current?.pauseVideo?.();
    } catch {}
    setPlayerLayout('hidden');
  };

  if (!channel) return null;

  // Info card sits to the left of the video card, with a 12px gap
  const infoCardRight = CARD_RIGHT + VIDEO_W + 12;
  const infoCardWidth = 260;

  return (
    <>
      {/* Info card — channel + show details + progress */}
      <div
        className="group fixed z-[35] rounded-xl overflow-hidden"
        style={{
          top: CARD_TOP,
          right: infoCardRight,
          width: infoCardWidth,
          height: VIDEO_H,
        }}
      >
        {/* Glass background */}
        <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-md border border-white/15 rounded-xl" />

        {/* Content */}
        <div className="relative h-full flex flex-col p-4 gap-3">
          {/* Channel + show */}
          <div className="flex items-start gap-3 flex-1 min-h-0">
            <ChannelAvatar
              thumbnailUrl={channel.thumbnail_url}
              channelName={channel.channel_name}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold mb-0.5">
                Now Playing
              </div>
              <div className="text-sm font-semibold text-white truncate leading-snug">
                {channel.channel_name}
              </div>
              {current && (
                <div className="text-xs text-gray-400 mt-1 line-clamp-2 leading-snug">
                  {current.title}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {current && (
            <div className="flex-shrink-0">
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-gray-500 text-[10px] text-right tabular-nums">
                {formatDuration(elapsed)} / {formatDuration(current.duration)}
              </div>
            </div>
          )}
        </div>

        {/* Controls — only visible on hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={handleExpand}
            title="Go fullscreen"
            className="p-1.5 rounded-lg bg-black/40 text-gray-300 hover:text-white hover:bg-black/60 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            title="Close"
            className="p-1.5 rounded-lg bg-black/40 text-gray-300 hover:text-white hover:bg-black/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};
