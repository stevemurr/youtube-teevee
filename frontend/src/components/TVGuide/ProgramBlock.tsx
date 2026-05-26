import React from 'react';
import clsx from 'clsx';

interface ProgramBlockProps {
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  isCurrentProgram: boolean;
  isWatchedChannel?: boolean;
  width: number;
  onClick?: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const ProgramBlock: React.FC<ProgramBlockProps> = ({
  title,
  startTime,
  endTime,
  duration,
  isCurrentProgram,
  isWatchedChannel = false,
  width,
  onClick
}) => {
  const isNarrow = width < 120;
  const isVeryNarrow = width < 80;
  const durationLabel = formatDuration(duration);

  return (
    <div
      className={clsx(
        'h-full p-2 text-xs transition-all duration-300 flex flex-col justify-center group relative',
        'bg-gray-900/70 border-gray-600 hover:bg-gray-800/80',
        isCurrentProgram && isWatchedChannel && 'ring-2 ring-blue-400',
        isCurrentProgram && !isWatchedChannel && 'ring-1 ring-white/20',
        'border rounded-md overflow-visible cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* inner clip layer so text doesn't bleed out of the block */}
      <div className="overflow-hidden">
        <div className="truncate font-medium">
          <span className="text-white">{title}</span>
        </div>
        {!isNarrow && (
          <div className="text-gray-400 text-[10px] mt-1">{durationLabel}</div>
        )}
        {isNarrow && !isVeryNarrow && (
          <div className="text-gray-400 text-[10px] mt-1">{durationLabel}</div>
        )}
      </div>

      {/* Tooltip for narrow blocks — shows full title + time range */}
      {isNarrow && (
        <div className={clsx(
          'absolute left-0 top-full mt-1 z-10 pointer-events-none',
          'hidden group-hover:block',
          'bg-gray-900 border border-white/20 rounded-md shadow-lg',
          'px-3 py-2 text-xs text-white whitespace-nowrap max-w-xs'
        )}>
          <div className="font-medium truncate">{title}</div>
          <div className="text-gray-400 mt-0.5">
            {startTime.substring(0, 5)} – {endTime.substring(0, 5)} · {durationLabel}
          </div>
        </div>
      )}
    </div>
  );
};
