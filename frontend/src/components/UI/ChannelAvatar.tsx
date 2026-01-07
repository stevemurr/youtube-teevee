import React, { useState } from 'react';
import { ensureProtocol } from '../../utils/url';

interface ChannelAvatarProps {
  thumbnailUrl: string;
  channelName: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ChannelAvatar: React.FC<ChannelAvatarProps> = ({ 
  thumbnailUrl, 
  channelName,
  size = 'md' 
}) => {
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-12 h-12 text-xl'
  };

  const handleImageError = () => {
    console.log(`Failed to load thumbnail for ${channelName}:`, thumbnailUrl);
    
    // Try once more with a cache-busting parameter
    if (retryCount === 0) {
      setRetryCount(1);
      // Force a reload by changing the key
      setTimeout(() => {
        setImageError(false);
      }, 100);
    } else {
      setImageError(true);
    }
  };

  const showFallback = !thumbnailUrl || imageError;
  const imageUrl = ensureProtocol(thumbnailUrl);
  
  // Add cache-busting parameter on retry
  const finalImageUrl = retryCount > 0 && imageUrl 
    ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
    : imageUrl;

  if (showFallback) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-700 flex items-center justify-center`}>
        <span className="text-white font-bold">
          {channelName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      key={`${channelName}-${retryCount}`}
      src={finalImageUrl}
      alt={channelName}
      className={`${sizeClasses[size]} rounded-full object-cover`}
      onError={handleImageError}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
};