import React from 'react';
import clsx from 'clsx';

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'overlay' | 'card';
  onClick?: () => void;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  className,
  variant = 'default',
  onClick
}) => {
  const variants = {
    default: 'glass-container',
    overlay: 'glass-overlay',
    card: 'channel-card cursor-pointer'
  };

  return (
    <div 
      className={clsx(variants[variant], className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
};