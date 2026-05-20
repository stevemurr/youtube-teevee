import React from 'react';
import clsx from 'clsx';
import { ProgramBlock } from './ProgramBlock';
import { timeStringToSeconds, dateToSeconds } from '../../utils/time';

interface Channel {
  youtube_channel_id: string;
  channel_name: string;
  thumbnail_url: string;
}

interface ProgramSlot {
  startTime: string;
  endTime: string;
  videoId: string;
  title: string;
  duration: number;
  type: 'video' | 'intermission';
}

interface ChannelRowProps {
  channel: Channel;
  programs: ProgramSlot[];
  currentTime: Date;
  isSelected: boolean;
  onSelect: () => void;
  pixelsPerHour: number;
}

export const ChannelRow: React.FC<ChannelRowProps> = ({
  channel,
  programs,
  currentTime,
  isSelected,
  onSelect,
  pixelsPerHour
}) => {
  const currentSeconds = dateToSeconds(currentTime);

  const getPositionAndWidth = (program: ProgramSlot) => {
    const startSeconds = timeStringToSeconds(program.startTime);
    const position = (startSeconds / 3600) * pixelsPerHour;
    const width = (program.duration / 3600) * pixelsPerHour;
    return { position, width };
  };

  const isCurrentProgram = (program: ProgramSlot): boolean => {
    const startSeconds = timeStringToSeconds(program.startTime);
    const endSeconds = timeStringToSeconds(program.endTime);
    return currentSeconds >= startSeconds && currentSeconds < endSeconds;
  };

  return (
    <div 
      className={clsx(
        'flex border-b border-white/10 hover:bg-white/5 cursor-pointer transition-all',
        isSelected && 'bg-white/10'
      )}
      onClick={onSelect}
    >
      {/* Channel Info */}
      <div className="w-48 flex-shrink-0 p-4 border-r border-white/10">
        <div className="flex items-center space-x-3">
          <img
            src={channel.thumbnail_url}
            alt={channel.channel_name}
            className="w-10 h-10 rounded-full"
          />
          <div className="overflow-hidden">
            <div className="text-sm font-medium text-white truncate">
              {channel.channel_name}
            </div>
          </div>
        </div>
      </div>

      {/* Programs */}
      <div className="flex-1 relative h-16">
        {programs.map((program, index) => {
          const { position, width } = getPositionAndWidth(program);
          return (
            <div
              key={`${program.startTime}-${index}`}
              className="absolute top-0"
              style={{ left: `${position}px` }}
            >
              <ProgramBlock
                title={program.title}
                startTime={program.startTime}
                endTime={program.endTime}
                duration={program.duration}
                type={program.type}
                isCurrentProgram={isCurrentProgram(program)}
                width={width}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};