import React from 'react';
import clsx from 'clsx';

interface ProgramBlockProps {
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  isCurrentProgram: boolean;
  width: number;
  onClick?: () => void;
}

export const ProgramBlock: React.FC<ProgramBlockProps> = ({
  title,
  startTime,
  endTime,
  duration,
  isCurrentProgram,
  width,
  onClick
}) => {
  const isNarrow = width < 120;
  const isVeryNarrow = width < 80;

  return (
    <div
      className={clsx(
        'h-full p-2 text-xs transition-all duration-300 flex flex-col justify-center group relative',
        'bg-gray-900/70 border-gray-600 hover:bg-gray-800/80',
        isCurrentProgram && 'ring-2 ring-blue-400/50',
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
          <div className="text-gray-400 text-[10px] mt-1">
            {startTime.substring(0, 5)} - {endTime.substring(0, 5)}
          </div>
        )}
        {isNarrow && !isVeryNarrow && (
          <div className="text-gray-400 text-[10px] mt-1">
            {Math.floor(duration / 60)}m
          </div>
        )}
      </div>

      {/* Custom tooltip anchored below the block — only for narrow blocks where title is clipped */}
      {isNarrow && (
        <div className={clsx(
          'absolute left-0 top-full mt-1 z-20 pointer-events-none',
          'hidden group-hover:block',
          'bg-gray-900 border border-white/20 rounded-md shadow-lg',
          'px-3 py-2 text-xs text-white whitespace-nowrap max-w-xs'
        )}>
          <div className="font-medium truncate">{title}</div>
          <div className="text-gray-400 mt-0.5">
            {startTime.substring(0, 5)} – {endTime.substring(0, 5)} · {Math.floor(duration / 60)}m
          </div>
        </div>
      )}
    </div>
  );
};
