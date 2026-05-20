import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChannelTransition } from '../components/VideoPlayer/ChannelTransition';
import { ChannelList } from '../components/ChannelList/ChannelList';
import { GlassContainer, GlassButton, ChannelAvatar } from '../components/UI';
import { useTVStore } from '../store/useTVStore';
import { useVideoPlayer } from '../contexts/VideoPlayerContext';

export const Watch: React.FC = () => {
  const navigate = useNavigate();
  const [showChannelList, setShowChannelList] = useState(false);
  const [channelChangeNotification, setChannelChangeNotification] = useState<string | null>(null);
  const {
    channels,
    currentChannelId,
    setCurrentChannel,
    fetchChannels,
    fetchTimeline,
    setShowMiniPlayer,
    setPlayerLayout
  } = useTVStore();
  const { playChannel } = useVideoPlayer();

  useEffect(() => {
    if (!currentChannelId) {
      navigate('/guide');
    }
  }, [currentChannelId, navigate]);

  // Play the channel when it changes
  useEffect(() => {
    if (currentChannelId) {
      playChannel(currentChannelId);
    }
  }, [currentChannelId, playChannel]);

  useEffect(() => {
    // Fetch data if not loaded
    if (channels.length === 0) {
      fetchChannels();
      fetchTimeline();
    }
    // Close mini player when returning to watch
    setShowMiniPlayer(false);
    // Set player to fullscreen layout
    setPlayerLayout('fullscreen');

  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const enabledChannels = channels.filter(c => c.enabled);
      const currentIndex = enabledChannels.findIndex(c => c.youtube_channel_id === currentChannelId);

      switch (e.key.toLowerCase()) {
        case 'arrowup':
          e.preventDefault();
          if (currentIndex > 0) {
            const nextChannel = enabledChannels[currentIndex - 1];
            setCurrentChannel(nextChannel.youtube_channel_id);
            showChannelNotification(nextChannel.channel_name);
          }
          break;
        
        case 'arrowdown':
          e.preventDefault();
          if (currentIndex < enabledChannels.length - 1) {
            const nextChannel = enabledChannels[currentIndex + 1];
            setCurrentChannel(nextChannel.youtube_channel_id);
            showChannelNotification(nextChannel.channel_name);
          }
          break;
        
        case 'g':
          e.preventDefault();
          setShowMiniPlayer(true);
          navigate('/guide');
          break;
        
        case 'c':
          e.preventDefault();
          setShowChannelList(!showChannelList);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [channels, currentChannelId, showChannelList, navigate, setCurrentChannel, setShowMiniPlayer]);

  const currentChannel = channels.find(c => c.youtube_channel_id === currentChannelId);

  const showChannelNotification = (channelName: string) => {
    setChannelChangeNotification(channelName);
    setTimeout(() => setChannelChangeNotification(null), 2000);
  };

  const handleChannelSelect = (channelId: string) => {
    setCurrentChannel(channelId);
    setShowChannelList(false);
    const channel = channels.find(c => c.youtube_channel_id === channelId);
    if (channel) {
      showChannelNotification(channel.channel_name);
    }
  };

  if (!currentChannelId || !currentChannel) {
    return null;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* ChannelTransition handles swap logic and overlays */}
      <ChannelTransition>
        <div /> {/* Placeholder - player is rendered by GlobalVideoPlayer */}
      </ChannelTransition>

      {/* Channel HUD */}
      <GlassContainer
        className="absolute top-4 left-4 px-4 py-2 z-30"
        variant="overlay"
      >
        <div className="flex items-center space-x-3">
          <ChannelAvatar
            thumbnailUrl={currentChannel.thumbnail_url}
            channelName={currentChannel.channel_name}
            size="sm"
          />
          <div className="text-white font-medium">
            {currentChannel.channel_name}
          </div>
        </div>
      </GlassContainer>

      {/* Control Buttons */}
      <div className="absolute top-4 right-4 flex space-x-2 z-30">
        <GlassButton
          size="sm"
          onClick={() => setShowChannelList(!showChannelList)}
        >
          Channels
        </GlassButton>
        <GlassButton
          size="sm"
          onClick={() => {
            setShowMiniPlayer(true);
            navigate('/guide');
          }}
        >
          Guide
        </GlassButton>
      </div>

      {/* Channel List Sidebar */}
      {showChannelList && (
        <div className="absolute top-0 right-0 w-80 h-full z-40">
          <ChannelList
            channels={channels}
            currentChannelId={currentChannelId}
            onChannelSelect={handleChannelSelect}
            onClose={() => setShowChannelList(false)}
          />
        </div>
      )}

      {/* Channel Change Notification */}
      {channelChangeNotification && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <GlassContainer 
            variant="overlay" 
            className="px-6 py-3 text-lg font-medium text-white animate-fade-in"
          >
            <div className="flex items-center space-x-3">
              <span className="text-gray-300">Switching to</span>
              <span>{channelChangeNotification}</span>
            </div>
          </GlassContainer>
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      <div className="absolute bottom-4 left-4 z-30">
        <GlassContainer className="px-3 py-2 text-xs text-gray-400">
          <span>↑/↓ Change Channel • G Guide • C Channels</span>
        </GlassContainer>
      </div>
    </div>
  );
};