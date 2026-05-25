import React from 'react';

interface TimeHeaderProps {
  pixelsPerHour: number;
  startHour?: number;
  hoursToShow?: number;
}

export const TimeHeader: React.FC<TimeHeaderProps> = ({ 
  pixelsPerHour, 
  startHour = new Date().getHours(),
  hoursToShow = 6 
}) => {
  const hours = Array.from({ length: hoursToShow }, (_, i) => (startHour + i) % 24);

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  return (
    <div className="bg-gray-900 border-b border-white/10 h-12" style={{ minWidth: `${hoursToShow * pixelsPerHour}px` }}>
      <div className="flex">
        {hours.map((hour, index) => (
          <div
            key={`${hour}-${index}`}
            className="text-center border-r border-white/5"
            style={{ width: `${pixelsPerHour}px` }}
          >
            <div className="py-3 text-sm text-gray-400">
              {formatHour(hour)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};