import React, { useMemo } from 'react';
import { useYouTubeLoader } from '../../hooks/useYouTubeLoader';
import { usePlayerPair } from '../../hooks/usePlayerPair';
import { useTVStore } from '../../store/useTVStore';

/**
 * GlobalVideoPlayer - Manages two YouTube player instances for seamless switching.
 *
 * Architecture:
 * - Active player: Currently visible, playing the current channel
 * - Preload player: Hidden, buffering the next channel
 *
 * When swapping:
 * - We swap container VISIBILITY, not player refs
 * - The preload container becomes visible, active container becomes hidden
 * - Then we destroy the old player and reset for next preload
 */
export const GlobalVideoPlayer: React.FC = () => {
  const isAPIReady = useYouTubeLoader();
  const { activeContainer, containerARef, containerBRef } = usePlayerPair(isAPIReady);
  const playerLayout = useTVStore(state => state.playerLayout);

  const wrapperStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      transition: 'all 300ms ease-out',
      overflow: 'hidden',
    };

    switch (playerLayout) {
      case 'fullscreen':
        return { ...base, top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, borderRadius: 0 };
      case 'pip':
        return {
          ...base,
          top: 'calc(100vh - 225px - 16px)',
          left: 'calc(100vw - 400px - 16px)',
          width: 400,
          height: 225,
          zIndex: 50,
          borderRadius: 12,
        };
      case 'hidden':
      default:
        return {
          ...base,
          top: 'calc(100vh - 225px - 16px)',
          left: 'calc(100vw - 400px - 16px)',
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
        };
    }
  }, [playerLayout]);

  return (
    <>
      <div id="global-video-player-wrapper" style={wrapperStyle}>
        <div
          id="global-video-player-a"
          data-active={activeContainer === 'a'}
          style={{
            position: 'absolute',
            inset: 0,
            visibility: activeContainer === 'a' ? 'visible' : 'hidden',
            zIndex: activeContainer === 'a' ? 1 : 0,
          }}
        >
          <div
            ref={containerARef}
            className="youtube-player-container"
            style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
          />
        </div>

        <div
          id="global-video-player-b"
          data-active={activeContainer === 'b'}
          style={{
            position: 'absolute',
            inset: 0,
            visibility: activeContainer === 'b' ? 'visible' : 'hidden',
            zIndex: activeContainer === 'b' ? 1 : 0,
          }}
        >
          <div
            ref={containerBRef}
            className="youtube-player-container"
            style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
          />
        </div>
      </div>

      <style>{`
        .youtube-player-container iframe {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        #global-video-player-wrapper {
          background: black;
        }
      `}</style>
    </>
  );
};
