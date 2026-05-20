import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassContainer, GlassButton, LoadingSpinner, ChannelAvatar } from '../components/UI';
import { api } from '../api/client';
import { useTVStore } from '../store/useTVStore';
import type { ChannelSwitchMode } from '../store/useTVStore';
import { logger } from '../utils/logger';
import clsx from 'clsx';

interface UserSettings {
  excludeShorts?: boolean;
  excludeLivestreams?: boolean;
  maxVideoDuration?: number;
}

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { channels, toggleChannel, logout, channelSwitchMode, setChannelSwitchMode, token } = useTVStore();
  const [settings, setSettings] = useState<UserSettings>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<any>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    fetchSettings();
    checkRefreshStatus();
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup event source on unmount
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      logger.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await api.put('/settings', settings);
      setMessage('Settings saved successfully');
    } catch (error) {
      setMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };


  const checkRefreshStatus = async () => {
    try {
      const response = await api.get('/data-refresh/status');
      if (response.data.isRunning) {
        setRefreshProgress(response.data.progress);
        subscribeToProgress();
      }
    } catch (error) {
      logger.error('Failed to check refresh status:', error);
    }
  };

  const subscribeToProgress = () => {
    const source = new EventSource(`${api.defaults.baseURL}/data-refresh/progress?token=${token}`);
    
    source.onmessage = (event) => {
      const progress = JSON.parse(event.data);
      setRefreshProgress(progress);
      
      if (progress.status === 'completed' || progress.status === 'error') {
        source.close();
        setEventSource(null);
        setRefreshProgress(null);
        if (progress.status === 'completed') {
          setMessage('Data refresh completed successfully!');
          // Reload channels after refresh
          useTVStore.getState().fetchChannels();
        }
      }
    };
    
    source.onerror = () => {
      source.close();
      setEventSource(null);
      setRefreshProgress(null);
    };
    
    setEventSource(source);
  };

  const startDataRefresh = async () => {
    try {
      const response = await api.post('/data-refresh/start', {
        browser: 'chrome',
        videosPerChannel: 50
      });
      
      setRefreshProgress(response.data.status);
      subscribeToProgress();
    } catch (error: any) {
      if (error.response?.status === 400) {
        setMessage('Data refresh is already in progress');
      } else {
        setMessage('Failed to start data refresh');
      }
    }
  };

  const rebuildTimeline = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      await api.post('/timeline/regenerate');
      setMessage('Timeline rebuilt successfully from database');
      
      // Clear the stored timeline to force reload
      await useTVStore.getState().fetchChannels();
    } catch (error) {
      setMessage('Failed to rebuild timeline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading settings..." />;
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <GlassButton onClick={() => navigate('/guide')}>
            Back to Guide
          </GlassButton>
        </div>

        {/* Message */}
        {message && (
          <GlassContainer className="p-4">
            <p className={clsx(
              'text-sm',
              message.includes('Failed') ? 'text-red-400' : 'text-green-400'
            )}>
              {message}
            </p>
          </GlassContainer>
        )}

        {/* Video Preferences */}
        <GlassContainer variant="overlay" className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Video Preferences</h2>
          <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-2">
              Note: Videos 3 minutes or shorter are automatically excluded
            </div>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.excludeLivestreams || false}
                onChange={(e) => setSettings({...settings, excludeLivestreams: e.target.checked})}
                className="w-4 h-4 bg-white/10 border-white/20 rounded"
              />
              <span className="text-gray-300">Exclude Livestreams</span>
            </label>

            <div>
              <label className="block text-gray-300 mb-2">
                Maximum Video Duration (hours)
              </label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={(settings.maxVideoDuration || 7200) / 3600}
                onChange={(e) => setSettings({
                  ...settings, 
                  maxVideoDuration: parseFloat(e.target.value) * 3600
                })}
                className="glass-input w-32"
              />
            </div>

            <GlassButton onClick={saveSettings} loading={isSaving}>
              Save Preferences
            </GlassButton>
          </div>
        </GlassContainer>

        {/* Channel Switch Mode */}
        <GlassContainer variant="overlay" className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Channel Switching</h2>
          <p className="text-gray-300 text-sm mb-4">
            Choose how channels transition when you switch between them.
          </p>
          <div className="space-y-3">
            {[
              { mode: 'instant' as ChannelSwitchMode, label: 'Instant', description: 'Switch immediately with no transition' },
              { mode: 'animation' as ChannelSwitchMode, label: 'TV Static', description: 'Classic TV static effect during switch' },
              { mode: 'wait' as ChannelSwitchMode, label: 'Wait for Load', description: 'Show loading indicator until video is ready' },
            ].map(({ mode, label, description }) => (
              <label
                key={mode}
                className={clsx(
                  'flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors',
                  channelSwitchMode === mode
                    ? 'bg-blue-500/20 border border-blue-500/50'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                )}
              >
                <input
                  type="radio"
                  name="channelSwitchMode"
                  value={mode}
                  checked={channelSwitchMode === mode}
                  onChange={() => setChannelSwitchMode(mode)}
                  className="mt-1 w-4 h-4 accent-blue-500"
                />
                <div>
                  <span className="text-white font-medium">{label}</span>
                  <p className="text-gray-400 text-sm">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </GlassContainer>

        {/* Data Refresh */}
        <GlassContainer variant="overlay" className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Data Refresh</h2>
          <div className="space-y-4">
            {refreshProgress ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm font-medium">
                    {refreshProgress.message}
                  </span>
                  {refreshProgress.status === 'fetching_videos' && refreshProgress.currentChannel && (
                    <span className="text-gray-400 text-xs">
                      {refreshProgress.currentChannel}/{refreshProgress.totalChannels}
                    </span>
                  )}
                </div>
                
                {refreshProgress.currentChannelName && (
                  <p className="text-gray-400 text-xs">
                    Current: {refreshProgress.currentChannelName}
                  </p>
                )}
                
                {refreshProgress.status === 'fetching_videos' && (
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${((refreshProgress.currentChannel || 0) / (refreshProgress.totalChannels || 1)) * 100}%` 
                      }}
                    />
                  </div>
                )}
                
                {refreshProgress.newVideos !== undefined && (
                  <p className="text-sm text-gray-400">
                    New videos found: {refreshProgress.newVideos}
                  </p>
                )}
                
                {refreshProgress.status === 'error' && refreshProgress.error && (
                  <p className="text-sm text-red-400">{refreshProgress.error}</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-gray-300 text-sm">
                  Fetch the latest videos from your YouTube subscriptions using yt-dlp.
                  This process uses your browser cookies to access your subscription data.
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Requires yt-dlp to be installed</p>
                  <p>• Uses Chrome browser cookies by default</p>
                  <p>• Fetches up to 50 videos per channel</p>
                </div>
                <GlassButton 
                  onClick={startDataRefresh} 
                  disabled={!!refreshProgress}
                >
                  Refresh YouTube Data
                </GlassButton>
              </>
            )}
          </div>
        </GlassContainer>

        {/* Timeline Management */}
        <GlassContainer variant="overlay" className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Timeline Management</h2>
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Rebuild the TV programming timeline using videos from your database.
              This will create a fresh 24-hour schedule for all channels.
            </p>
            <GlassButton onClick={rebuildTimeline} loading={isLoading}>
              Rebuild Timeline
            </GlassButton>
          </div>
        </GlassContainer>

        {/* Channel Management */}
        <GlassContainer variant="overlay" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Channels</h2>
            <p className="text-sm text-gray-400">Use data refresh above to update</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {channels.map(channel => (
              <div
                key={channel.youtube_channel_id}
                className={clsx(
                  'flex items-center justify-between p-3 rounded-lg',
                  'bg-white/5 border',
                  channel.enabled ? 'border-white/20' : 'border-white/10 opacity-60'
                )}
              >
                <div className="flex items-center space-x-3">
                  <ChannelAvatar 
                    thumbnailUrl={channel.thumbnail_url}
                    channelName={channel.channel_name}
                    size="md"
                  />
                  <span className="text-white text-sm">
                    {channel.channel_name}
                  </span>
                </div>
                <button
                  onClick={() => toggleChannel(channel.id, !channel.enabled)}
                  className={clsx(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    channel.enabled
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  )}
                >
                  {channel.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </GlassContainer>

        {/* Account */}
        <GlassContainer variant="overlay" className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Account</h2>
          <GlassButton variant="danger" onClick={handleLogout}>
            Logout
          </GlassButton>
        </GlassContainer>
      </div>
    </div>
  );
};