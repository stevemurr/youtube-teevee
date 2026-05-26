import React from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { ProgramBlock } from './ProgramBlock';
import { timeStringToSeconds, dateToSeconds } from '../../utils/time';
import type { ProgramSlot } from '../../types';

interface LazyChannelRowProps {
  programs: ProgramSlot[];
  currentTime: Date;
  currentHour: number;
  hoursToShow: number;
  pixelsPerHour: number;
  isWatchedChannel?: boolean;
  onSelect?: () => void;
}

export const LazyChannelRow: React.FC<LazyChannelRowProps> = ({
  programs,
  currentTime,
  currentHour,
  hoursToShow,
  pixelsPerHour,
  isWatchedChannel = false,
  onSelect,
}) => {
  const { targetRef, isVisible } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0,
    rootMargin: '200px',
  });

  const currentSeconds = dateToSeconds(currentTime);

  const windowStartSeconds = currentHour * 3600;
  const windowEndSeconds = windowStartSeconds + (hoursToShow * 3600);

  return (
    <div
      ref={targetRef}
      className="h-20 border-b border-white/10 relative"
    >
      {isVisible ? (
        programs.map((program, index) => {
          const startSeconds = timeStringToSeconds(program.startTime);
          const endSeconds = timeStringToSeconds(program.endTime);
          
          // Skip programs outside the 6-hour window
          if (endSeconds <= windowStartSeconds || startSeconds >= windowEndSeconds) {
            return null;
          }
          
          // Adjust position relative to current window
          const adjustedStartSeconds = Math.max(startSeconds, windowStartSeconds);
          const adjustedEndSeconds = Math.min(endSeconds, windowEndSeconds);
          const position = ((adjustedStartSeconds - windowStartSeconds) / 3600) * pixelsPerHour;
          const calculatedWidth = ((adjustedEndSeconds - adjustedStartSeconds) / 3600) * pixelsPerHour;
          // Ensure minimum width of 80px for very short content (about 8 minutes at 600px/hour)
          const width = Math.max(calculatedWidth, 80);
          
          const isCurrentProgram = currentSeconds >= startSeconds && currentSeconds < endSeconds;

          return (
            <div
              key={`${program.startTime}-${index}`}
              className="absolute inset-y-0 p-1"
              style={{ left: `${position}px`, width: `${width}px` }}
            >
              <ProgramBlock
                title={program.title}
                startTime={program.startTime}
                endTime={program.endTime}
                duration={program.duration}
                isCurrentProgram={isCurrentProgram}
                isWatchedChannel={isWatchedChannel}
                width={width}
                onClick={onSelect}
              />
            </div>
          );
        }).filter(Boolean)
      ) : (
        // Placeholder while loading
        <div className="h-full flex items-center justify-center">
          <div className="h-12 bg-gray-800/20 rounded animate-pulse" style={{ width: '80%' }} />
        </div>
      )}
    </div>
  );
};