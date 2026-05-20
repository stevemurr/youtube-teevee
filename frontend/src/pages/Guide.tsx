import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassContainer, LoadingSpinner, GlassButton, ChannelAvatar } from '../components/UI';
import { TimeHeader } from '../components/TVGuide/TimeHeader';
import { LazyChannelRow } from '../components/TVGuide/LazyChannelRow';
import { CurrentTimeIndicator } from '../components/TVGuide/CurrentTimeIndicator';
import { MiniPlayer } from '../components/VideoPlayer/MiniPlayer';
import { useTVStore } from '../store/useTVStore';
import { useDataRefresh } from '../hooks/useDataRefresh';
import { GUIDE_PIXELS_PER_HOUR, GUIDE_HOURS_TO_SHOW } from '../utils/constants';
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

  const { isRefreshing, startRefresh } = useDataRefresh();

  const pixelsPerHour = GUIDE_PIXELS_PER_HOUR;
  const hoursToShow = GUIDE_HOURS_TO_SHOW;
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
            <GlassButton
              size="sm"
              onClick={() => startRefresh()}
              loading={isRefreshing}
              disabled={isRefreshing}
            >
              {isRefreshing ? '' : 'Fetch Data'}
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
          {/* Single scroll container — handles both x and y */}
          <div className="h-full overflow-auto" ref={scrollContainerRef}>

            {/* Sticky time ruler — scrolls horizontally, pins vertically */}
            <div
              className="sticky top-0 z-20 flex bg-gray-900"
              style={{ minWidth: `${192 + hoursToShow * pixelsPerHour}px` }}
            >
              <div className="w-48 flex-shrink-0 h-12 border-r border-b border-white/10 bg-gray-900" />
              <TimeHeader
                pixelsPerHour={pixelsPerHour}
                startHour={currentHour}
                hoursToShow={hoursToShow}
              />
            </div>

            {/* Channel rows */}
            <div
              className="relative"
              style={{ minWidth: `${192 + hoursToShow * pixelsPerHour}px` }}
            >
              {enabledChannels.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <p className="text-sm">No channels enabled.</p>
                </div>
              ) : (
                enabledChannels.map(channel => (
                  <div key={channel.youtube_channel_id} className="flex">
                    {/* Channel name — sticky left */}
                    <div
                      className={clsx(
                        'w-48 flex-shrink-0 h-20 p-4',
                        'flex items-center',
                        'border-b border-r border-white/10',
                        'sticky left-0 z-10 bg-gray-900',
                        'hover:bg-white/5 cursor-pointer transition-all',
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

                    {/* Program row */}
                    <div style={{ width: `${hoursToShow * pixelsPerHour}px`, flexShrink: 0 }}>
                      <LazyChannelRow
                        programs={timeline[channel.youtube_channel_id] || []}
                        currentTime={currentTime}
                        currentHour={currentHour}
                        hoursToShow={hoursToShow}
                        pixelsPerHour={pixelsPerHour}
                        onSelect={() => handleChannelSelect(channel.youtube_channel_id)}
                      />
                    </div>
                  </div>
                ))
              )}

              {/* Current time indicator — offset past the sticky channel sidebar */}
              <CurrentTimeIndicator
                currentTime={currentTime}
                pixelsPerHour={pixelsPerHour}
                startHour={currentHour}
                sidebarOffset={192}
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