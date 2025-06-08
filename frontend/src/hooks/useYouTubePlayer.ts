import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface UseYouTubePlayerProps {
  videoId: string;
  startSeconds: number;
  onEnd?: () => void;
}

export const useYouTubePlayer = ({ videoId, startSeconds, onEnd }: UseYouTubePlayerProps) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const onEndRef = useRef(onEnd);
  const startSecondsRef = useRef(startSeconds);

  // Update refs when props change
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    startSecondsRef.current = startSeconds;
  }, [startSeconds]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsReady(true);
      };
    } else {
      setIsReady(true);
    }
  }, []);

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
    }

    // Update previous video ID
    previousVideoIdRef.current = videoId;

    // Create new player
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 1, // Show controls for better user experience
        disablekb: 0,
        fs: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        start: Math.floor(startSecondsRef.current),
        iv_load_policy: 3
      },
      events: {
        onReady: (event: any) => {
          event.target.playVideo();
          setIsPlaying(true);
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