import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassContainer, LoadingSpinner, GlassButton, ChannelAvatar } from '../components/UI';
import { TimeHeader } from '../components/TVGuide/TimeHeader';
import { LazyChannelRow } from '../components/TVGuide/LazyChannelRow';
import { CurrentTimeIndicator } from '../components/TVGuide/CurrentTimeIndicator';
import { MiniPlayer } from '../components/VideoPlayer/MiniPlayer';
import { useTVStore } from '../store/useTVStore';
import clsx from 'clsx';

export const Guide: React.FC = () => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    channels,
    timeline,
    currentTime,
    currentChannelId,
    isLoading,
    error,
    fetchChannels,
    fetchTimeline,
    setCurrentChannel,
    refreshTimeline,
    showMiniPlayer,
    setShowMiniPlayer
  } = useTVStore();

  const pixelsPerHour = 1320; // Increased by 10% to prevent overlap
  const hoursToShow = 6; // Only show next 6 hours
  const currentHour = currentTime.getHours();

  useEffect(() => {
    // Fetch initial data
    fetchChannels();
    fetchTimeline();
  }, []);

  useEffect(() => {
    // Auto-scroll to start (current time is at the beginning for 6-hour view)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [timeline]);

  const handleChannelSelect = (channelId: string) => {
    setCurrentChannel(channelId);
    // If PIP is active, stay on guide and let mini player update
    // Otherwise, go fullscreen
    if (!showMiniPlayer) {
      navigate('/watch');
    }
  };

  const handleRefresh = () => {
    refreshTimeline();
  };

  if (isLoading && Object.keys(timeline).length === 0) {
    return <LoadingSpinner fullScreen message="Loading TV Guide..." />;
  }

  const enabledChannels = channels.filter(c => c.enabled);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white">TV Guide</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">
              {currentTime.toLocaleTimeString()}
            </span>
            <GlassButton size="sm" onClick={handleRefresh}>
              Refresh
            </GlassButton>
            <GlassButton size="sm" onClick={() => navigate('/settings')}>
              Settings
            </GlassButton>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* TV Guide Grid */}
      <div className="flex-1 overflow-hidden p-4">
        <GlassContainer className="h-full" variant="overlay">
          <div className="h-full flex">
            {/* Sticky Channel Sidebar */}
            <div className="flex-shrink-0 w-48 border-r border-white/10 overflow-y-auto sticky left-0 z-10 bg-gray-900/95">
              {/* Empty header space */}
              <div className="h-12 border-b border-white/10 bg-gray-800/50"></div>
              
              {/* Channel List */}
              {enabledChannels.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <p className="text-sm">No channels enabled.</p>
                </div>
              ) : (
                enabledChannels.map(channel => (
                  <div
                    key={channel.youtube_channel_id}
                    className={clsx(
                      'h-20 p-4 border-b border-white/10 flex items-center cursor-pointer',
                      'hover:bg-white/5 transition-all',
                      channel.youtube_channel_id === currentChannelId && 'bg-white/10'
                    )}
                    onClick={() => handleChannelSelect(channel.youtube_channel_id)}
                  >
                    <div className="flex items-center space-x-3">
                      <ChannelAvatar 
                        thumbnailUrl={channel.thumbnail_url}
                        channelName={channel.channel_name}
                        size="md"
                      />
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-white truncate">
                          {channel.channel_name}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Scrollable Timeline Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden relative" ref={scrollContainerRef}>
              {/* Time Header */}
              <TimeHeader 
                pixelsPerHour={pixelsPerHour} 
                startHour={currentHour}
                hoursToShow={hoursToShow}
              />

              {/* Program Grid */}
              <div className="relative" style={{ minWidth: `${hoursToShow * pixelsPerHour}px` }}>
                {enabledChannels.map(channel => (
                  <LazyChannelRow
                    key={channel.youtube_channel_id}
                    channel={channel}
                    programs={timeline[channel.youtube_channel_id] || []}
                    currentTime={currentTime}
                    currentHour={currentHour}
                    hoursToShow={hoursToShow}
                    pixelsPerHour={pixelsPerHour}
                    onSelect={() => handleChannelSelect(channel.youtube_channel_id)}
                  />
                ))}
              </div>

              {/* Current Time Indicator */}
              <CurrentTimeIndicator 
                currentTime={currentTime} 
                pixelsPerHour={pixelsPerHour}
                startHour={currentHour}
              />
            </div>
          </div>
        </GlassContainer>
      </div>

      {/* Mini Player */}
      {showMiniPlayer && currentChannelId && (
        <MiniPlayer onClose={() => setShowMiniPlayer(false)} />
      )}
    </div>
  );
};