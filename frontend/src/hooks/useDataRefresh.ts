import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { useTVStore } from '../store/useTVStore';

export interface RefreshProgress {
  status: 'idle' | 'starting' | 'fetching_subscriptions' | 'fetching_channels' | 'fetching_videos' | 'fetching_thumbnails' | 'completed' | 'error';
  message: string;
  currentChannel?: number;
  totalChannels?: number;
  currentChannelName?: string;
  newVideos?: number;
  error?: string;
}

function calcProgress(p: RefreshProgress): number {
  if (p.status === 'completed') return 100;
  if (p.status === 'fetching_videos' && p.totalChannels) {
    return Math.round(((p.currentChannel || 0) / p.totalChannels) * 100);
  }
  if (p.status === 'fetching_channels') return 5;
  return 0;
}

export function useDataRefresh() {
  const { addToast, updateToast, removeToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState<RefreshProgress | null>(null);
  const [cookiesReady, setCookiesReady] = useState<boolean | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const toastIdRef = useRef<string | null>(null);
  const token = useTVStore(s => s.token);

  const checkCookies = useCallback(async () => {
    try {
      const res = await api.get('/data-refresh/cookies-status');
      setCookiesReady(res.data.exists === true);
    } catch {
      setCookiesReady(false);
    }
  }, []);

  const subscribeToProgress = useCallback(() => {
    if (eventSourceRef.current) return;

    const source = new EventSource(`${api.defaults.baseURL}/data-refresh/progress?token=${token}`);
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      const p: RefreshProgress = JSON.parse(event.data);
      setProgress(p);

      if (toastIdRef.current) {
        updateToast(toastIdRef.current, {
          message: p.message,
          detail: p.currentChannelName,
          progress: calcProgress(p),
        });
      }

      if (p.status === 'completed' || p.status === 'error') {
        source.close();
        eventSourceRef.current = null;
        setIsRefreshing(false);
        setProgress(null);

        if (toastIdRef.current) removeToast(toastIdRef.current);
        toastIdRef.current = null;

        if (p.status === 'completed') {
          addToast({
            type: 'success',
            message: p.message || 'Refresh complete',
            autoDismiss: 5000,
          });
          useTVStore.getState().fetchChannels();
        } else {
          addToast({
            type: 'error',
            message: 'Refresh failed',
            detail: p.error,
            autoDismiss: 6000,
          });
        }
      }
    };

    source.onerror = () => {
      source.close();
      eventSourceRef.current = null;
      setIsRefreshing(false);
      setProgress(null);
      if (toastIdRef.current) removeToast(toastIdRef.current);
      toastIdRef.current = null;
    };
  }, [token, addToast, updateToast, removeToast]);

  // Check cookies and re-attach to any in-progress refresh on mount
  useEffect(() => {
    checkCookies();
    api.get('/data-refresh/status').then(res => {
      if (res.data.isRunning) {
        setIsRefreshing(true);
        setProgress(res.data.progress);
        toastIdRef.current = addToast({
          type: 'progress',
          message: res.data.progress?.message || 'Refreshing data...',
          progress: calcProgress(res.data.progress || {}),
        });
        subscribeToProgress();
      }
    }).catch(() => {});
  }, []);

  const startRefresh = useCallback(async () => {
    if (isRefreshing) return;
    if (!cookiesReady) {
      addToast({
        type: 'error',
        message: 'No cookies file found',
        detail: 'Run ./scripts/export-cookies.sh on your host machine first',
        autoDismiss: 7000,
      });
      return;
    }
    try {
      await api.post('/data-refresh/start', { videosPerChannel: 50 });
      setIsRefreshing(true);
      toastIdRef.current = addToast({
        type: 'progress',
        message: 'Starting data refresh...',
        progress: 0,
      });
      subscribeToProgress();
    } catch (err: any) {
      const msg = err.response?.status === 400
        ? 'Refresh already in progress'
        : (err.response?.data?.error || 'Failed to start refresh');
      addToast({ type: 'error', message: msg, autoDismiss: 5000 });
    }
  }, [isRefreshing, cookiesReady, addToast, subscribeToProgress]);

  useEffect(() => {
    return () => { eventSourceRef.current?.close(); };
  }, []);

  return { isRefreshing, progress, cookiesReady, startRefresh, checkCookies };
}
