import React, { useEffect, useState } from 'react';
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer';
import { GlassContainer } from '../UI';
import { api } from '../../api/client';
import { useTVStore } from '../../store/useTVStore';

interface VideoPlayerProps {
  channelId: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ channelId }) => {
  const [currentProgram, setCurrentProgram] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialStartTime, setInitialStartTime] = useState<number>(0);
  const { timeline: _timeline } = useTVStore();

  const fetchCurrentProgram = async (isInitial = false) => {
    try {
      const response = await api.get('/timeline/current-program', {
        params: { channelId }
      });
      
      // Only update start time on initial load or when video changes
      if (isInitial || response.data.program?.videoId !== currentProgram?.program?.videoId) {
        setInitialStartTime(response.data.elapsed || 0);
      }
      
      setCurrentProgram(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch current program:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentProgram(true);
    // Check for video changes every 30 seconds (not every 5)
    const interval = setInterval(() => fetchCurrentProgram(false), 30000);
    return () => clearInterval(interval);
  }, [channelId]);

  const { containerRef } = useYouTubePlayer({
    videoId: currentProgram?.program?.videoId || '',
    startSeconds: initialStartTime,
    onEnd: () => fetchCurrentProgram(true)
  });

  if (isLoading) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!currentProgram?.program || currentProgram.program.type === 'intermission') {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <GlassContainer className="p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Coming Up Next</h2>
          <p className="text-gray-400">Please stand by...</p>
        </GlassContainer>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
};