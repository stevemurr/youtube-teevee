import React from 'react';
import { GlassContainer } from './GlassContainer';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  fullScreen = false,
  message = 'Loading...'
}) => {
  const content = (
    <GlassContainer className="p-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-300">{message}</p>
      </div>
    </GlassContainer>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};