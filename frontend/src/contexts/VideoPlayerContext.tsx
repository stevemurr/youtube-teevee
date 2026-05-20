import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';
import { logger } from '../utils/logger';
import type { ProgramSlot } from '../types';

interface PlayerSlot {
  channelId: string;
  program: ProgramSlot | null;
  elapsed: number;
  isReady: boolean;
  isPlaying: boolean;
}

interface VideoPlayerState {
  // Active player (currently visible)
  active: PlayerSlot | null;
  // Preload player (hidden, buffering next channel)
  preload: PlayerSlot | null;
  // UI states
  isLoading: boolean;
  isSwapping: boolean;
  swapReady: boolean;
}

interface VideoPlayerContextValue extends VideoPlayerState {
  // Refs for both player containers
  activeContainerRef: React.RefObject<HTMLDivElement | null>;
  preloadContainerRef: React.RefObject<HTMLDivElement | null>;
  activePlayerRef: React.MutableRefObject<any>;
  preloadPlayerRef: React.MutableRefObject<any>;

  // Actions
  playChannel: (channelId: string) => Promise<void>;
  setActiveReady: (ready: boolean) => void;
  setActivePlaying: (playing: boolean) => void;
  setPreloadReady: (ready: boolean) => void;
  setPreloadPlaying: (playing: boolean) => void;
  executeSwap: () => void;
  refreshCurrentProgram: () => Promise<void>;
}

const VideoPlayerContext = createContext<VideoPlayerContextValue | null>(null);

export const useVideoPlayer = () => {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
  }
  return context;
};

interface VideoPlayerProviderProps {
  children: React.ReactNode;
}

export const VideoPlayerProvider: React.FC<VideoPlayerProviderProps> = ({ children }) => {
  // Refs for both player slots
  const activeContainerRef = useRef<HTMLDivElement>(null);
  const preloadContainerRef = useRef<HTMLDivElement>(null);
  const activePlayerRef = useRef<any>(null);
  const preloadPlayerRef = useRef<any>(null);

  const [state, setState] = useState<VideoPlayerState>({
    active: null,
    preload: null,
    isLoading: false,
    isSwapping: false,
    swapReady: false,
  });

  const fetchCurrentProgram = useCallback(async (channelId: string): Promise<{ program: ProgramSlot | null; elapsed: number }> => {
    const now = new Date();
    const response = await api.get('/timeline/current-program', {
      params: {
        channelId,
        localHour: now.getHours(),
        localMinute: now.getMinutes(),
        localSecond: now.getSeconds()
      }
    });
    return response.data;
  }, []);

  const playChannel = useCallback(async (channelId: string) => {
    logger.log(`[VideoPlayerContext] playChannel called: ${channelId}`);

    // If no active player, this is initial load - go directly to active slot
    if (!state.active) {
      logger.log('[VideoPlayerContext] No active player, loading directly to active slot');
      setState(prev => ({ ...prev, isLoading: true }));

      try {
        const { program, elapsed } = await fetchCurrentProgram(channelId);
        logger.log(`[VideoPlayerContext] Initial load: ${program?.title}, elapsed: ${elapsed}`);

        setState(prev => ({
          ...prev,
          active: {
            channelId,
            program,
            elapsed,
            isReady: false,
            isPlaying: false,
          },
          isLoading: false,
        }));
      } catch (error) {
        logger.error('[VideoPlayerContext] Failed to fetch program:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
      return;
    }

    // If same channel, do nothing
    if (channelId === state.active.channelId) {
      logger.log('[VideoPlayerContext] Same channel, skipping');
      return;
    }

    // If already preloading a different channel, cancel it
    if (state.preload && state.preload.channelId !== channelId) {
      logger.log('[VideoPlayerContext] Canceling previous preload');
      // The GlobalVideoPlayer will handle destroying the preload player
    }

    // Start preloading the new channel
    logger.log('[VideoPlayerContext] Starting preload for new channel');
    setState(prev => ({
      ...prev,
      isLoading: true,
      swapReady: false,
      preload: null, // Clear any existing preload
    }));

    try {
      const { program, elapsed } = await fetchCurrentProgram(channelId);
      logger.log(`[VideoPlayerContext] Preload fetched: ${program?.title}, elapsed: ${elapsed}`);

      setState(prev => ({
        ...prev,
        preload: {
          channelId,
          program,
          elapsed,
          isReady: false,
          isPlaying: false,
        },
        isLoading: false,
      }));
    } catch (error) {
      logger.error('[VideoPlayerContext] Failed to fetch program for preload:', error);
      setState(prev => ({ ...prev, isLoading: false, preload: null }));
    }
  }, [state.active, fetchCurrentProgram]);

  const setActiveReady = useCallback((ready: boolean) => {
    setState(prev => {
      if (!prev.active) return prev;
      return {
        ...prev,
        active: { ...prev.active, isReady: ready }
      };
    });
  }, []);

  const setActivePlaying = useCallback((playing: boolean) => {
    setState(prev => {
      if (!prev.active) return prev;
      return {
        ...prev,
        active: { ...prev.active, isPlaying: playing }
      };
    });
  }, []);

  const setPreloadReady = useCallback((ready: boolean) => {
    setState(prev => {
      if (!prev.preload) return prev;
      return {
        ...prev,
        preload: { ...prev.preload, isReady: ready }
      };
    });
  }, []);

  const setPreloadPlaying = useCallback((playing: boolean) => {
    logger.log(`[VideoPlayerContext] setPreloadPlaying: ${playing}`);
    setState(prev => {
      if (!prev.preload) return prev;

      // When preload starts playing, it's ready for swap
      const newSwapReady = playing;
      if (newSwapReady) {
        logger.log('[VideoPlayerContext] Preload is playing, swap ready!');
      }

      return {
        ...prev,
        preload: { ...prev.preload, isPlaying: playing },
        swapReady: newSwapReady,
      };
    });
  }, []);

  const executeSwap = useCallback(() => {
    logger.log('[VideoPlayerContext] Executing swap');

    setState(prev => {
      if (!prev.preload) {
        logger.warn('[VideoPlayerContext] No preload to swap');
        return prev;
      }

      // Swap: preload becomes active, clear preload slot
      return {
        ...prev,
        active: prev.preload,
        preload: null,
        isSwapping: false,
        swapReady: false,
      };
    });
  }, []);

  const refreshCurrentProgram = useCallback(async () => {
    if (!state.active?.channelId) return;

    try {
      const { program, elapsed } = await fetchCurrentProgram(state.active.channelId);

      // Only update if video changed
      if (program?.videoId !== state.active.program?.videoId) {
        setState(prev => {
          if (!prev.active) return prev;
          return {
            ...prev,
            active: {
              ...prev.active,
              program,
              elapsed,
            }
          };
        });
      }
    } catch (error) {
      logger.error('[VideoPlayerContext] Failed to refresh program:', error);
    }
  }, [state.active?.channelId, state.active?.program?.videoId, fetchCurrentProgram]);

  // Refresh current program every 30 seconds
  useEffect(() => {
    if (!state.active?.channelId) return;

    const interval = setInterval(refreshCurrentProgram, 30000);
    return () => clearInterval(interval);
  }, [state.active?.channelId, refreshCurrentProgram]);

  const value: VideoPlayerContextValue = {
    ...state,
    // Derived values for compatibility
    activeContainerRef,
    preloadContainerRef,
    activePlayerRef,
    preloadPlayerRef,
    playChannel,
    setActiveReady,
    setActivePlaying,
    setPreloadReady,
    setPreloadPlaying,
    executeSwap,
    refreshCurrentProgram,
  };

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  );
};
