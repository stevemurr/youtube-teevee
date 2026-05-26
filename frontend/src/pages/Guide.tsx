import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Settings } from 'lucide-react';
import { GlassContainer, LoadingSpinner, ChannelAvatar } from '../components/UI';
import { TimeHeader } from '../components/TVGuide/TimeHeader';
import { LazyChannelRow } from '../components/TVGuide/LazyChannelRow';
import { CurrentTimeIndicator } from '../components/TVGuide/CurrentTimeIndicator';
import { NowPlayingStrip } from '../components/TVGuide/NowPlayingStrip';
import { useTVStore } from '../store/useTVStore';
import { useDataRefresh } from '../hooks/useDataRefresh';
import { GUIDE_PIXELS_PER_HOUR, GUIDE_HOURS_TO_SHOW } from '../utils/constants';
import clsx from 'clsx';

export const Guide: React.FC = () => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timeHeaderScrollRef = useRef<HTMLDivElement>(null);
  const {
    channels,
    timeline,
    currentTime,
    currentChannelId,
    isLoading,
    error,
    playerLayout,
    fetchChannels,
    fetchTimeline,
    setCurrentChannel,
    setPlayerLayout,
  } = useTVStore();

  const { isRefreshing, startRefresh } = useDataRefresh();

  const pixelsPerHour = GUIDE_PIXELS_PER_HOUR;
  const hoursToShow = GUIDE_HOURS_TO_SHOW;
  const currentHour = currentTime.getHours();
  const SIDEBAR_WIDTH = 288; // w-72

  const showStrip = playerLayout === 'strip' && currentChannelId !== null;

  useEffect(() => {
    fetchChannels();
    fetchTimeline();
  }, []);

  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (hasScrolledRef.current || !scrollContainerRef.current || Object.keys(timeline).length === 0) return;
    hasScrolledRef.current = true;
    const container = scrollContainerRef.current;
    const now = new Date();
    const playheadPixel = (now.getMinutes() + now.getSeconds() / 60) / 60 * pixelsPerHour;
    container.scrollLeft = Math.max(0, playheadPixel - (container.clientWidth - SIDEBAR_WIDTH) / 2);
  }, [timeline]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const timeHeaderScroll = timeHeaderScrollRef.current;
    if (!scrollContainer || !timeHeaderScroll) return;
    const sync = () => { timeHeaderScroll.scrollLeft = scrollContainer.scrollLeft; };
    scrollContainer.addEventListener('scroll', sync, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', sync);
  }, []);

  const handleChannelSelect = (channelId: string) => {
    setCurrentChannel(channelId);
    setPlayerLayout('fullscreen');
    navigate('/watch');
  };

  if (isLoading && Object.keys(timeline).length === 0) {
    return <LoadingSpinner fullScreen message="Loading TV Guide..." />;
  }

  const enabledChannels = channels.filter(c => c.enabled);

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header — h-16 sticky, icon-only action buttons */}
      <header className="sticky top-0 z-40 h-16 flex items-center px-4 border-b border-white/10 bg-gray-900/90 backdrop-blur-sm">
        <h1 className="text-xl font-bold text-white flex-1">TV Guide</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 tabular-nums">
            {currentTime.toLocaleTimeString()}
          </span>
          <button
            onClick={() => startRefresh()}
            disabled={isRefreshing}
            title="Fetch Data"
            className={clsx(
              'p-2 rounded-lg border border-white/20 transition-colors',
              isRefreshing
                ? 'text-gray-600 border-white/10 cursor-not-allowed'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            )}
          >
            <RefreshCw className={clsx('w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
          <button
            onClick={() => navigate('/settings')}
            title="Settings"
            className="p-2 rounded-lg border border-white/20 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Now Playing strip — sticky below header, only while something is playing */}
      {showStrip && <NowPlayingStrip />}

      {/* Error */}
      {error && (
        <div className="px-4 pt-3">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* TV Guide Grid */}
      <div className="flex-1 min-h-0 p-4">
        <GlassContainer className="h-full flex flex-col overflow-hidden" variant="overlay">

          {/* Pinned time ruler */}
          <div className="flex-shrink-0 flex bg-gray-900">
            <div className="w-72 flex-shrink-0 h-12 border-r-2 border-b border-white/20" />
            <div className="flex-1 overflow-hidden" ref={timeHeaderScrollRef}>
              <TimeHeader
                pixelsPerHour={pixelsPerHour}
                startHour={currentHour}
                hoursToShow={hoursToShow}
              />
            </div>
          </div>

          {/* Channel rows */}
          <div className="flex-1 overflow-auto min-h-0" ref={scrollContainerRef}>
            <div
              className="relative"
              style={{ minWidth: `${SIDEBAR_WIDTH + hoursToShow * pixelsPerHour}px` }}
            >
              {enabledChannels.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <p className="text-sm">No channels enabled.</p>
                </div>
              ) : (
                enabledChannels.map(channel => {
                  const isWatched = channel.youtube_channel_id === currentChannelId;
                  return (
                    <div key={channel.youtube_channel_id} className="flex">
                      {/* Channel sidebar cell — sticky left */}
                      <div
                        className={clsx(
                          'w-72 flex-shrink-0 h-20 p-4',
                          'flex items-center',
                          'border-b border-r-2 border-white/20',
                          'sticky left-0 z-30',
                          'cursor-pointer transition-all',
                          isWatched
                            ? 'bg-gray-700 border-l-2 border-l-blue-400'
                            : 'bg-gray-900 hover:bg-gray-800'
                        )}
                        onClick={() => handleChannelSelect(channel.youtube_channel_id)}
                      >
                        <div className="flex items-center space-x-3">
                          <ChannelAvatar
                            thumbnailUrl={channel.thumbnail_url}
                            channelName={channel.channel_name}
                            size="md"
                          />
                          <div className="min-w-0 overflow-hidden">
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
                          isWatchedChannel={isWatched}
                          onSelect={() => handleChannelSelect(channel.youtube_channel_id)}
                        />
                      </div>
                    </div>
                  );
                })
              )}

              <CurrentTimeIndicator
                currentTime={currentTime}
                pixelsPerHour={pixelsPerHour}
                startHour={currentHour}
                sidebarOffset={SIDEBAR_WIDTH}
              />
            </div>
          </div>

        </GlassContainer>
      </div>
    </div>
  );
};
