import { useEffect, useRef, useState, useCallback } from 'react';
import { useVideoPlayer } from '../contexts/VideoPlayerContext';

type Container = 'a' | 'b';

interface PendingCleanup {
  playerRef: { current: any };
  videoRef: { current: string };
}

const createYTPlayer = (
  container: HTMLDivElement,
  videoId: string,
  elapsed: number,
  muted: boolean,
  onReady: () => void,
  onStateChange: (data: number) => void
) =>
  new window.YT.Player(container, {
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
      ...(muted ? { mute: 1 } : {}),
    },
    events: {
      onReady: (event: any) => { event.target.playVideo(); onReady(); },
      onStateChange: (event: any) => onStateChange(event.data),
    },
  });

export const usePlayerPair = (isAPIReady: boolean) => {
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

  const [activeContainer, setActiveContainer] = useState<Container>('a');

  const containerARef = useRef<HTMLDivElement>(null);
  const containerBRef = useRef<HTMLDivElement>(null);
  const containerAVideoRef = useRef('');
  const containerBVideoRef = useRef('');
  const containerAPlayerRef = useRef<any>(null);
  const containerBPlayerRef = useRef<any>(null);
  const prevActiveVideoRef = useRef('');
  const pendingCleanupRef = useRef<PendingCleanup | null>(null);

  const handleVideoEnd = useCallback(() => {
    refreshCurrentProgram();
  }, [refreshCurrentProgram]);

  // Create player in the active container
  useEffect(() => {
    if (!isAPIReady) return;
    const videoId = active?.program?.videoId;
    const elapsed = active?.elapsed || 0;
    const containerRef = activeContainer === 'a' ? containerARef : containerBRef;
    const playerRef = activeContainer === 'a' ? containerAPlayerRef : containerBPlayerRef;
    const videoRef = activeContainer === 'a' ? containerAVideoRef : containerBVideoRef;

    if (!containerRef.current || !videoId) return;
    if (videoRef.current === videoId && playerRef.current) return;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    videoRef.current = videoId;
    playerRef.current = createYTPlayer(
      containerRef.current,
      videoId,
      elapsed,
      false,
      () => setActiveReady(true),
      (data) => {
        setActivePlaying(data === window.YT.PlayerState.PLAYING);
        if (data === window.YT.PlayerState.ENDED) handleVideoEnd();
      }
    );
    activePlayerRef.current = playerRef.current;
  }, [isAPIReady, active?.program?.videoId, active?.elapsed, activeContainer, setActiveReady, setActivePlaying, handleVideoEnd, activePlayerRef]);

  // Create player in the preload (opposite) container
  useEffect(() => {
    if (!isAPIReady) return;
    const videoId = preload?.program?.videoId;
    const elapsed = preload?.elapsed || 0;
    const containerRef = activeContainer === 'a' ? containerBRef : containerARef;
    const playerRef = activeContainer === 'a' ? containerBPlayerRef : containerAPlayerRef;
    const videoRef = activeContainer === 'a' ? containerBVideoRef : containerAVideoRef;

    if (!containerRef.current || !videoId) return;
    if (videoRef.current === videoId && playerRef.current) return;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    videoRef.current = videoId;
    playerRef.current = createYTPlayer(
      containerRef.current,
      videoId,
      elapsed,
      true,
      () => setPreloadReady(true),
      (data) => setPreloadPlaying(data === window.YT.PlayerState.PLAYING)
    );
    preloadPlayerRef.current = playerRef.current;
  }, [isAPIReady, preload?.program?.videoId, preload?.elapsed, activeContainer, setPreloadReady, setPreloadPlaying, preloadPlayerRef]);

  // Detect swap: active video changed and a preload player is ready
  useEffect(() => {
    const currentActiveVideo = active?.program?.videoId || '';

    if (currentActiveVideo && prevActiveVideoRef.current && currentActiveVideo !== prevActiveVideoRef.current) {
      const newActivePlayer = activeContainer === 'a' ? containerBPlayerRef : containerAPlayerRef;

      if (newActivePlayer.current) {
        pendingCleanupRef.current = {
          playerRef: activeContainer === 'a' ? containerAPlayerRef : containerBPlayerRef,
          videoRef: activeContainer === 'a' ? containerAVideoRef : containerBVideoRef,
        };

        newActivePlayer.current?.unMute?.();

        setActiveContainer(activeContainer === 'a' ? 'b' : 'a');
        activePlayerRef.current = newActivePlayer.current;
        preloadPlayerRef.current = null;

        requestAnimationFrame(() => {
          const cleanup = pendingCleanupRef.current;
          if (cleanup?.playerRef.current) {
            try { cleanup.playerRef.current.stopVideo(); } catch (_) {}
            cleanup.playerRef.current.destroy();
            cleanup.playerRef.current = null;
          }
          if (cleanup?.videoRef) cleanup.videoRef.current = '';
          pendingCleanupRef.current = null;
        });
      }
    }

    prevActiveVideoRef.current = currentActiveVideo;
  }, [active?.program?.videoId, activeContainer, activePlayerRef, preloadPlayerRef]);

  return { activeContainer, containerARef, containerBRef };
};
