import React, { useEffect } from 'react';
import { GlassButton } from '../UI';
import { ChannelTransition } from './ChannelTransition';
import { useTVStore } from '../../store/useTVStore';
import { useNavigate } from 'react-router-dom';
import { useVideoPlayer } from '../../contexts/VideoPlayerContext';
import { logger } from '../../utils/logger';

interface MiniPlayerProps {
  onClose?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { currentChannelId, channels, setPlayerLayout } = useTVStore();
  const { playChannel, activePlayerRef } = useVideoPlayer();
  const currentChannel = channels.find(c => c.youtube_channel_id === currentChannelId);

  // Set player to PIP layout on mount
  useEffect(() => {
    setPlayerLayout('pip');

    // Ensure the channel is playing
    if (currentChannelId) {
      playChannel(currentChannelId);
    }

    return () => {
      // Hide player on unmount (close)
      setPlayerLayout('hidden');
    };
  }, [currentChannelId, playChannel, setPlayerLayout]);

  // Handle close - hide player and call onClose
  const handleClose = () => {
    // Stop the player to prevent background audio
    const player = activePlayerRef.current;
    if (player) {
      try {
        if (player.pauseVideo) player.pauseVideo();
      } catch (e) {
        logger.warn('[MiniPlayer] Error pausing player:', e);
      }
    }
    setPlayerLayout('hidden');
    onClose?.();
  };

  // Handle expand - go to fullscreen watch
  const handleExpand = () => {
    navigate('/watch');
  };

  if (!currentChannelId || !currentChannel) return null;

  // The video player itself is rendered by GlobalVideoPlayer in fixed position
  // MiniPlayer just renders the overlay controls on top of it
  return (
    <>
      {/* ChannelTransition handles swap logic */}
      <ChannelTransition>
        <div /> {/* Placeholder */}
      </ChannelTransition>

      {/* Overlay controls - positioned over the PIP player */}
      <div
        className="fixed z-[51] pointer-events-none"
        style={{ top: 'calc(100vh - 225px - 16px)', left: 'calc(100vw - 400px - 16px)', width: 400, height: 225 }}
      >
        <div className="relative w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-auto rounded-xl">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img
                    src={currentChannel.thumbnail_url}
                    alt={currentChannel.channel_name}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-white text-sm font-medium truncate max-w-[200px]">
                    {currentChannel.channel_name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <GlassButton
                    size="sm"
                    onClick={handleExpand}
                    className="!py-1 !px-2 text-xs"
                  >
                    Expand
                  </GlassButton>
                  {onClose && (
                    <button
                      onClick={handleClose}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                      aria-label="Close mini player"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};