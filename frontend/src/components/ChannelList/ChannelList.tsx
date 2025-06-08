import React from 'react';
import clsx from 'clsx';
import { GlassContainer, ChannelAvatar } from '../UI';

interface Channel {
  youtube_channel_id: string;
  channel_name: string;
  thumbnail_url: string;
  enabled: boolean;
}

interface ChannelListProps {
  channels: Channel[];
  currentChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
}

interface ExtendedChannelListProps extends ChannelListProps {
  onClose?: () => void;
}

export const ChannelList: React.FC<ExtendedChannelListProps> = ({
  channels,
  currentChannelId,
  onChannelSelect,
  onClose
}) => {
  const enabledChannels = channels.filter(c => c.enabled);

  return (
    <GlassContainer className="h-full p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Channels</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="space-y-2">
        {enabledChannels.map(channel => (
          <button
            key={channel.youtube_channel_id}
            onClick={() => onChannelSelect(channel.youtube_channel_id)}
            className={clsx(
              'w-full p-3 rounded-lg transition-all duration-200',
              'flex items-center space-x-3',
              'hover:bg-white/10',
              currentChannelId === channel.youtube_channel_id
                ? 'bg-white/20 border border-white/30'
                : 'bg-white/5 border border-white/10'
            )}
          >
            <ChannelAvatar 
              thumbnailUrl={channel.thumbnail_url}
              channelName={channel.channel_name}
              size="md"
            />
            <span className="text-white text-sm font-medium truncate">
              {channel.channel_name}
            </span>
          </button>
        ))}
      </div>
    </GlassContainer>
  );
};