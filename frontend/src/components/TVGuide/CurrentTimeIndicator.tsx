import React from 'react';

interface CurrentTimeIndicatorProps {
  currentTime: Date;
  pixelsPerHour: number;
  startHour?: number;
  sidebarOffset?: number;
}

export const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  currentTime,
  pixelsPerHour,
  startHour = new Date().getHours(),
  sidebarOffset = 0,
}) => {
  const currentHours = currentTime.getHours() + currentTime.getMinutes() / 60;
  const windowStartHours = startHour;
  const relativePosition = (currentHours - windowStartHours) * pixelsPerHour;

  // Don't show indicator if current time is outside the window
  if (relativePosition < 0 || relativePosition > 6 * pixelsPerHour) {
    return null;
  }

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-20 pointer-events-none"
      style={{
        left: `${sidebarOffset + relativePosition}px`,
        boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
      }}
    >
      <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-400 rounded-full"></div>
    </div>
  );
};