import React from 'react';
import clsx from 'clsx';

interface ProgramBlockProps {
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: 'video' | 'intermission';
  isCurrentProgram: boolean;
  width: number;
}

export const ProgramBlock: React.FC<ProgramBlockProps> = ({
  title,
  startTime,
  endTime,
  duration,
  type: _type,
  isCurrentProgram,
  width
}) => {
  // Show abbreviated content for very narrow blocks
  const isNarrow = width < 120;
  const isVeryNarrow = width < 80;
  
  return (
    <div
      className={clsx(
        'h-full p-2 text-xs transition-all duration-300 flex flex-col justify-center group',
        'bg-gray-900/70 border-gray-600 hover:bg-gray-800/80',
        isCurrentProgram && 'ring-2 ring-blue-400/50',
        'border rounded-md overflow-hidden cursor-pointer'
      )}
      title={`${title}\n${startTime.substring(0, 5)} - ${endTime.substring(0, 5)}`}
    >
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
  );
};