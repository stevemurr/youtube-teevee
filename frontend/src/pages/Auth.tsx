import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassContainer, GlassButton, LoadingSpinner } from '../components/UI';
import { api } from '../api/client';
import { useTVStore } from '../store/useTVStore';

type Phase = 'loading' | 'setup' | 'connecting' | 'done' | 'error';

const BROWSERS = [
  { id: 'chrome',   label: 'Chrome'   },
  { id: 'firefox',  label: 'Firefox'  },
  { id: 'safari',   label: 'Safari'   },
  { id: 'brave',    label: 'Brave'    },
  { id: 'edge',     label: 'Edge'     },
  { id: 'atlas',    label: 'Atlas'    },
];

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useTVStore();
  const [phase, setPhase] = useState<Phase>('loading');
  const [connectingBrowser, setConnectingBrowser] = useState<string | null>(null);
  const [channelCount, setChannelCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { token, user } } = await api.post('/auth/login');
        setAuth(token, user);

        const { data: channels } = await api.get('/channels');
        if (channels.length > 0) {
          navigate('/guide');
        } else {
          setPhase('setup');
        }
      } catch {
        setPhase('error');
      }
    };
    init();
  }, []);

  const connectBrowser = async (browserId: string) => {
    setConnectingBrowser(browserId);
    setPhase('connecting');
    setError(null);

    try {
      const { data } = await api.post('/setup/browser', { browser: browserId });
      setChannelCount(data.channelCount);

      // Kick off the video fetch in the background so the guide populates
      await api.post('/data-refresh/start', { videosPerChannel: 50 });

      setPhase('done');
      setTimeout(() => navigate('/guide'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Connection failed. Check the browser is running and you are signed into YouTube.');
      setPhase('setup');
      setConnectingBrowser(null);
    }
  };

  if (phase === 'loading') {
    return <LoadingSpinner fullScreen message="Starting up..." />;
  }

  if (phase === 'connecting') {
    return (
      <LoadingSpinner
        fullScreen
        message={`Importing subscriptions from ${connectingBrowser}… this takes about 30 seconds`}
      />
    );
  }

  if (phase === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GlassContainer variant="overlay" className="w-full max-w-md p-8 text-center space-y-4">
          <div className="text-5xl">📺</div>
          <h2 className="text-2xl font-bold text-white">You're all set!</h2>
          <p className="text-gray-300">
            Found <span className="text-white font-semibold">{channelCount} channels</span>.
            Fetching videos in the background — your guide will populate shortly.
          </p>
          <p className="text-gray-500 text-sm">Taking you to the guide…</p>
        </GlassContainer>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GlassContainer variant="overlay" className="w-full max-w-md p-8 text-center space-y-4">
          <p className="text-red-400">Failed to start. Is the server running?</p>
          <GlassButton onClick={() => window.location.reload()}>Retry</GlassButton>
        </GlassContainer>
      </div>
    );
  }

  // phase === 'setup'
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <GlassContainer variant="overlay" className="w-full max-w-md p-8">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="text-5xl mb-4">📺</div>
            <h1 className="text-3xl font-bold text-white">YouTube TeeVee</h1>
            <p className="text-gray-300 text-sm leading-relaxed">
              Import your subscriptions from the browser where you're signed into YouTube.
              Your cookies stay on this machine — nothing is sent anywhere else.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Select your browser
            </p>
            <div className="grid grid-cols-2 gap-2">
              {BROWSERS.map(b => (
                <GlassButton
                  key={b.id}
                  onClick={() => connectBrowser(b.id)}
                  className="w-full justify-center"
                >
                  {b.label}
                </GlassButton>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-600 text-center">
            Requires <code className="text-gray-500">yt-dlp</code> — install with{' '}
            <code className="text-gray-500">brew install yt-dlp</code>
          </p>
        </div>
      </GlassContainer>
    </div>
  );
};
