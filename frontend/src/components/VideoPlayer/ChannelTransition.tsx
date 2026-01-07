import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTVStore } from '../../store/useTVStore';
import { useVideoPlayer } from '../../contexts/VideoPlayerContext';

interface ChannelTransitionProps {
  children: React.ReactNode;
}

/**
 * ChannelTransition - Handles visual transitions when switching channels.
 *
 * This component coordinates with the VideoPlayerContext to show transitions
 * when the preloaded video is ready to swap in.
 *
 * Modes:
 * - instant: No transition, swap immediately when ready
 * - animation: Shows TV static/noise effect during swap
 * - wait: Shows loading indicator until ready (handled by VideoPlayerPortal)
 */
export const ChannelTransition: React.FC<ChannelTransitionProps> = ({ children }) => {
  const { channelSwitchMode } = useTVStore();
  const { swapReady, executeSwap, preload, isLoading, activePlayerRef } = useVideoPlayer();
  const [showTransition, setShowTransition] = useState(false);
  const swapExecutedRef = useRef(false);

  // Mute the active player before swap to prevent audio overlap
  // Note: We only mute here, not pause/stop, to avoid visual flash
  // GlobalVideoPlayer handles the actual destruction after visibility swap
  const muteActivePlayer = useCallback(() => {
    const player = activePlayerRef.current;
    if (player) {
      console.log('[ChannelTransition] Muting active player before swap');
      try {
        if (player.mute) player.mute();
      } catch (e) {
        console.warn('[ChannelTransition] Error muting player:', e);
      }
    }
  }, [activePlayerRef]);

  // When swap becomes ready, handle based on mode
  useEffect(() => {
    if (!swapReady || swapExecutedRef.current) return;

    // Safety check: only proceed if there's actually a preload to swap to
    if (!preload?.program) {
      console.log('[ChannelTransition] swapReady but no preload, skipping');
      return;
    }

    console.log(`[ChannelTransition] Swap ready, mode: ${channelSwitchMode}`);

    // First, mute the active player to prevent audio overlap
    muteActivePlayer();

    if (channelSwitchMode === 'instant') {
      // Instant mode: swap immediately
      console.log('[ChannelTransition] Instant mode: executing swap immediately');
      swapExecutedRef.current = true;
      executeSwap();
    } else if (channelSwitchMode === 'animation') {
      // Animation mode: show transition, then swap
      console.log('[ChannelTransition] Animation mode: showing transition');
      setShowTransition(true);

      // After animation, execute swap
      const timer = setTimeout(() => {
        console.log('[ChannelTransition] Animation complete: executing swap');
        swapExecutedRef.current = true;
        executeSwap();
        setShowTransition(false);
      }, 500); // 500ms animation

      return () => clearTimeout(timer);
    } else if (channelSwitchMode === 'wait') {
      // Wait mode: loading was shown, now swap
      console.log('[ChannelTransition] Wait mode: executing swap');
      swapExecutedRef.current = true;
      executeSwap();
    }
  }, [swapReady, channelSwitchMode, executeSwap, muteActivePlayer, preload?.program]);

  // Reset swap executed ref when preload changes (new channel switch initiated)
  useEffect(() => {
    if (preload) {
      swapExecutedRef.current = false;
    }
  }, [preload?.channelId]);

  // Reset transition state when not swapping
  useEffect(() => {
    if (!swapReady && !isLoading) {
      setShowTransition(false);
    }
  }, [swapReady, isLoading]);

  return (
    <div className="relative w-full h-full">
      {children}

      {/* Animation mode transition overlay */}
      {channelSwitchMode === 'animation' && showTransition && (
        <TVStaticOverlay />
      )}

      {/* Wait mode shows while preloading (before swap ready) */}
      {channelSwitchMode === 'wait' && preload && !swapReady && (
        <LoadingOverlay />
      )}
    </div>
  );
};

/**
 * TV static/noise effect overlay
 */
const TVStaticOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Dark base */}
      <div className="absolute inset-0 bg-black" />

      {/* Animated static noise */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          animation: 'staticNoise 0.1s steps(10) infinite',
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      {/* Channel change text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white text-opacity-80 font-mono text-lg tracking-widest animate-pulse">
          SWITCHING...
        </div>
      </div>

      <style>{`
        @keyframes staticNoise {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -5%); }
          20% { transform: translate(-10%, 5%); }
          30% { transform: translate(5%, -10%); }
          40% { transform: translate(-5%, 15%); }
          50% { transform: translate(-10%, 5%); }
          60% { transform: translate(15%, 0); }
          70% { transform: translate(0, 10%); }
          80% { transform: translate(-15%, 0); }
          90% { transform: translate(10%, 5%); }
        }
      `}</style>
    </div>
  );
};

/**
 * Loading overlay for wait mode
 */
const LoadingOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin" />
        <span className="text-white/80 text-sm">Loading channel...</span>
      </div>
    </div>
  );
};

export default ChannelTransition;
