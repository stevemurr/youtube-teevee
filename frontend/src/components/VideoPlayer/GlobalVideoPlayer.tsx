import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useVideoPlayer } from '../../contexts/VideoPlayerContext';
import { useTVStore } from '../../store/useTVStore';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * GlobalVideoPlayer - Manages two YouTube player instances for seamless switching.
 *
 * Architecture:
 * - Active player: Currently visible, playing the current channel
 * - Preload player: Hidden, buffering the next channel
 *
 * When swapping:
 * - We swap container VISIBILITY, not player refs
 * - The preload container becomes visible, active container becomes hidden
 * - Then we destroy the old player and reset for next preload
 */
export const GlobalVideoPlayer: React.FC = () => {
  const {
    active,
    preload,
    activePlayerRef,
    preloadPlayerRef,
    setActiveReady,
    setActivePlaying,
    setPreloadReady,
    setPreloadPlaying,
    refreshCurrentProgram,
  } = useVideoPlayer();

  const [isAPIReady, setIsAPIReady] = useState(false);
  // Track which container is currently "active" (visible)
  const [activeContainer, setActiveContainer] = useState<'a' | 'b'>('a');

  // Track video IDs to detect changes
  const containerAVideoRef = useRef<string>('');
  const containerBVideoRef = useRef<string>('');
  const containerAPlayerRef = useRef<any>(null);
  const containerBPlayerRef = useRef<any>(null);

  // Refs for both containers
  const containerARef = useRef<HTMLDivElement>(null);
  const containerBRef = useRef<HTMLDivElement>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        console.log('[GlobalVideoPlayer] YouTube API ready');
        setIsAPIReady(true);
      };
    } else {
      setIsAPIReady(true);
    }
  }, []);

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    console.log('[GlobalVideoPlayer] Video ended');
    refreshCurrentProgram();
  }, [refreshCurrentProgram]);

  // Create player in the ACTIVE container when active changes
  useEffect(() => {
    if (!isAPIReady) return;

    const videoId = active?.program?.videoId;
    const elapsed = active?.elapsed || 0;
    const containerRef = activeContainer === 'a' ? containerARef : containerBRef;
    const playerRef = activeContainer === 'a' ? containerAPlayerRef : containerBPlayerRef;
    const videoRef = activeContainer === 'a' ? containerAVideoRef : containerBVideoRef;

    if (!containerRef.current || !videoId) return;

    // Same video, no need to recreate
    if (videoRef.current === videoId && playerRef.current) {
      return;
    }

    // Destroy existing player in this container
    if (playerRef.current) {
      console.log(`[GlobalVideoPlayer] Destroying player in container ${activeContainer}`);
      playerRef.current.destroy();
      playerRef.current = null;
    }

    videoRef.current = videoId;
    console.log(`[GlobalVideoPlayer] Creating active player in container ${activeContainer}: ${videoId} at ${elapsed}s`);

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 1,
        disablekb: 0,
        fs: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        start: Math.floor(elapsed),
        iv_load_policy: 3,
      },
      events: {
        onReady: (event: any) => {
          console.log('[GlobalVideoPlayer] Active player ready');
          event.target.playVideo();
          setActiveReady(true);
        },
        onStateChange: (event: any) => {
          const isPlaying = event.data === window.YT.PlayerState.PLAYING;
          setActivePlaying(isPlaying);
          if (event.data === window.YT.PlayerState.ENDED) {
            handleVideoEnd();
          }
        },
      },
    });

    // Update context refs
    activePlayerRef.current = playerRef.current;
  }, [isAPIReady, active?.program?.videoId, active?.elapsed, activeContainer, setActiveReady, setActivePlaying, handleVideoEnd, activePlayerRef]);

  // Create player in the PRELOAD container when preload changes
  useEffect(() => {
    if (!isAPIReady) return;

    const videoId = preload?.program?.videoId;
    const elapsed = preload?.elapsed || 0;
    // Preload goes in the OPPOSITE container
    const containerRef = activeContainer === 'a' ? containerBRef : containerARef;
    const playerRef = activeContainer === 'a' ? containerBPlayerRef : containerAPlayerRef;
    const videoRef = activeContainer === 'a' ? containerBVideoRef : containerAVideoRef;

    if (!containerRef.current) return;

    // No preload - clear tracking but don't destroy (swap might need it)
    if (!videoId) {
      return;
    }

    // Same video, no need to recreate
    if (videoRef.current === videoId && playerRef.current) {
      return;
    }

    // Destroy existing player in preload container if different video
    if (playerRef.current) {
      console.log(`[GlobalVideoPlayer] Destroying preload player for new video`);
      playerRef.current.destroy();
      playerRef.current = null;
    }

    videoRef.current = videoId;
    console.log(`[GlobalVideoPlayer] Creating preload player: ${videoId} at ${elapsed}s`);

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 1,
        disablekb: 0,
        fs: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        start: Math.floor(elapsed),
        iv_load_policy: 3,
        mute: 1, // Muted for autoplay
      },
      events: {
        onReady: (event: any) => {
          console.log('[GlobalVideoPlayer] Preload player ready');
          event.target.playVideo();
          setPreloadReady(true);
        },
        onStateChange: (event: any) => {
          const isPlaying = event.data === window.YT.PlayerState.PLAYING;
          console.log(`[GlobalVideoPlayer] Preload state: ${event.data}, playing: ${isPlaying}`);
          setPreloadPlaying(isPlaying);
        },
      },
    });

    // Update context refs
    preloadPlayerRef.current = playerRef.current;
  }, [isAPIReady, preload?.program?.videoId, preload?.elapsed, activeContainer, setPreloadReady, setPreloadPlaying, preloadPlayerRef]);

  // Handle swap - triggered by VideoPlayerContext when executeSwap is called
  // We detect this by watching for active.program.videoId changing to match what was preload
  const prevActiveVideoRef = useRef<string>('');
  const pendingCleanupRef = useRef<{ playerRef: React.MutableRefObject<any>, videoRef: React.MutableRefObject<string> } | null>(null);

  useEffect(() => {
    const currentActiveVideo = active?.program?.videoId || '';

    // Detect if this is a swap (active video changed and we have a preload player ready)
    if (currentActiveVideo &&
        prevActiveVideoRef.current &&
        currentActiveVideo !== prevActiveVideoRef.current) {

      const newActivePlayer = activeContainer === 'a' ? containerBPlayerRef : containerAPlayerRef;

      if (newActivePlayer.current) {
        console.log('[GlobalVideoPlayer] Swap detected! Switching containers');

        // Store refs for cleanup after render
        pendingCleanupRef.current = {
          playerRef: activeContainer === 'a' ? containerAPlayerRef : containerBPlayerRef,
          videoRef: activeContainer === 'a' ? containerAVideoRef : containerBVideoRef,
        };

        // 1. Unmute the new active player FIRST (while still hidden, prepares audio)
        if (newActivePlayer.current?.unMute) {
          console.log('[GlobalVideoPlayer] Unmuting new active player');
          newActivePlayer.current.unMute();
        }

        // 2. Swap which container is active (visibility change)
        const newActiveContainer = activeContainer === 'a' ? 'b' : 'a';
        setActiveContainer(newActiveContainer);

        // 3. Update context refs
        activePlayerRef.current = newActivePlayer.current;
        preloadPlayerRef.current = null;

        // 4. Defer destruction until after React has rendered the visibility change
        // Using requestAnimationFrame ensures the DOM has updated
        requestAnimationFrame(() => {
          const cleanup = pendingCleanupRef.current;
          if (cleanup?.playerRef.current) {
            console.log('[GlobalVideoPlayer] Destroying old active player (deferred)');
            try {
              cleanup.playerRef.current.stopVideo();
            } catch (e) {}
            cleanup.playerRef.current.destroy();
            cleanup.playerRef.current = null;
          }
          if (cleanup?.videoRef) {
            cleanup.videoRef.current = '';
          }
          pendingCleanupRef.current = null;
        });
      }
    }

    prevActiveVideoRef.current = currentActiveVideo;
  }, [active?.program?.videoId, activeContainer, activePlayerRef]);

  const playerLayout = useTVStore(state => state.playerLayout);

  // Compute wrapper styles based on layout
  // Use top/left positioning for both states so CSS can animate between them
  const wrapperStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      transition: 'all 300ms ease-out',
      overflow: 'hidden',
    };

    switch (playerLayout) {
      case 'fullscreen':
        return {
          ...base,
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          borderRadius: 0,
        };
      case 'pip':
        return {
          ...base,
          // Use calc() with top/left for consistent animation
          top: 'calc(100vh - 225px - 16px)',
          left: 'calc(100vw - 400px - 16px)',
          width: 400,
          height: 225,
          zIndex: 50,
          borderRadius: 12,
        };
      case 'hidden':
      default:
        return {
          ...base,
          // Hidden at PIP position so it animates from there
          top: 'calc(100vh - 225px - 16px)',
          left: 'calc(100vw - 400px - 16px)',
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
        };
    }
  }, [playerLayout]);

  return (
    <>
      {/* Fixed position wrapper - never moves in DOM */}
      <div id="global-video-player-wrapper" style={wrapperStyle}>
        {/* Container A */}
        <div
          id="global-video-player-a"
          data-active={activeContainer === 'a'}
          style={{
            position: 'absolute',
            inset: 0,
            visibility: activeContainer === 'a' ? 'visible' : 'hidden',
            zIndex: activeContainer === 'a' ? 1 : 0,
          }}
        >
          <div
            ref={containerARef}
            className="youtube-player-container"
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'auto',
            }}
          />
        </div>

        {/* Container B */}
        <div
          id="global-video-player-b"
          data-active={activeContainer === 'b'}
          style={{
            position: 'absolute',
            inset: 0,
            visibility: activeContainer === 'b' ? 'visible' : 'hidden',
            zIndex: activeContainer === 'b' ? 1 : 0,
          }}
        >
          <div
            ref={containerBRef}
            className="youtube-player-container"
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'auto',
            }}
          />
        </div>
      </div>

      {/* CSS to ensure YouTube iframes fill container */}
      <style>{`
        .youtube-player-container iframe {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        #global-video-player-wrapper {
          background: black;
        }
      `}</style>
    </>
  );
};
