import React from 'react';
import { GlassContainer, GlassButton } from '../UI';
import { VideoPlayer } from './VideoPlayer';
import { useTVStore } from '../../store/useTVStore';
import { useNavigate } from 'react-router-dom';

interface MiniPlayerProps {
  onClose?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { currentChannelId, channels } = useTVStore();
  const currentChannel = channels.find(c => c.youtube_channel_id === currentChannelId);

  if (!currentChannelId || !currentChannel) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50" style={{ width: '400px', height: '225px' }}>
      <GlassContainer className="relative w-full h-full overflow-hidden" variant="overlay">
        {/* Mini video player */}
        <div className="relative w-full h-full">
          <VideoPlayer channelId={currentChannelId} />
        </div>
        
        {/* Overlay controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
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
                  onClick={() => navigate('/watch')}
                  className="!py-1 !px-2 text-xs"
                >
                  Expand
                </GlassButton>
                {onClose && (
                  <button
                    onClick={onClose}
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
      </GlassContainer>
    </div>
  );
};