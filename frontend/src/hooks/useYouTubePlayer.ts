import { useEffect, useRef, useState, useCallback } from 'react';
import { useYouTubeLoader } from './useYouTubeLoader';
import { buildPlayerVars } from '../utils/youtube';

interface UseYouTubePlayerProps {
  videoId: string;
  startSeconds: number;
  onEnd?: () => void;
}

export const useYouTubePlayer = ({ videoId, startSeconds, onEnd }: UseYouTubePlayerProps) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isReady = useYouTubeLoader();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const onEndRef = useRef(onEnd);
  const startSecondsRef = useRef(startSeconds);

  // Update refs when props change
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const previousVideoIdRef = useRef<string>('');

  // Initialize player
  useEffect(() => {
    if (!isReady || !containerRef.current || !videoId) return;

    // Only create new player if video ID changed
    if (previousVideoIdRef.current === videoId && playerRef.current) {
      return;
    }

    // Clean up existing player
    if (playerRef.current) {
      playerRef.current.destroy();
      setIsPlayerReady(false);
    }

    // Update previous video ID
    previousVideoIdRef.current = videoId;

    // Create new player
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: buildPlayerVars(startSecondsRef.current),
      events: {
        onReady: (event: any) => {
          event.target.playVideo();
          setIsPlaying(true);
          setIsPlayerReady(true);
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            onEndRef.current?.();
          }
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
        }
      }
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isReady, videoId]); // Removed startSeconds and onEnd to prevent re-initialization

  // Seek when startSeconds changes (without recreating player)
  useEffect(() => {
    // Check isPlayerReady state AND verify seekTo method exists (defensive check for race conditions)
    if (isPlayerReady && playerRef.current?.seekTo && startSeconds !== startSecondsRef.current) {
      playerRef.current.seekTo(startSeconds, true);
      startSecondsRef.current = startSeconds;
    }
  }, [startSeconds, isPlayerReady]);

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  return {
    containerRef,
    isPlaying,
    play,
    pause
  };
};