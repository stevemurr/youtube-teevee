import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';
import type { Channel, ProgramSlot } from '../types';

interface Timeline {
  [channelId: string]: ProgramSlot[];
}

interface User {
  id: number;
  name?: string;
  avatarUrl?: string;
}

export type ChannelSwitchMode = 'instant' | 'animation' | 'wait' | 'preload';
export type PlayerLayout = 'fullscreen' | 'pip' | 'hidden';

interface TVState {
  // Authentication
  token: string | null;
  user: User | null;
  
  // Channels
  channels: Channel[];
  currentChannelId: string | null;
  
  // Timeline
  timeline: Timeline;
  currentDate: string;
  currentTime: Date;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  showMiniPlayer: boolean;

  // Settings
  channelSwitchMode: ChannelSwitchMode;
  playerLayout: PlayerLayout;

  // Actions
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setChannels: (channels: Channel[]) => void;
  setCurrentChannel: (channelId: string) => void;
  setTimeline: (timeline: Timeline) => void;
  updateCurrentTime: () => void;
  fetchChannels: () => Promise<void>;
  fetchTimeline: () => Promise<void>;
  toggleChannel: (channelId: number, enabled: boolean) => Promise<void>;
  refreshTimeline: () => Promise<void>;
  setShowMiniPlayer: (show: boolean) => void;
  setChannelSwitchMode: (mode: ChannelSwitchMode) => void;
  setPlayerLayout: (layout: PlayerLayout) => void;
}

export const useTVStore = create<TVState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      user: null,
      channels: [],
      currentChannelId: null,
      timeline: {},
      currentDate: new Date().toISOString().split('T')[0],
      currentTime: new Date(),
      isLoading: false,
      error: null,
      showMiniPlayer: false,
      channelSwitchMode: 'animation',
      playerLayout: 'hidden',

      // Auth actions
      setAuth: (token, user) => {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ token, user, error: null });
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ 
          token: null, 
          user: null, 
          channels: [], 
          timeline: {},
          currentChannelId: null 
        });
      },

      // Channel actions
      setChannels: (channels) => set({ channels }),
      
      setCurrentChannel: (channelId) => set({ currentChannelId: channelId }),

      // Timeline actions
      setTimeline: (timeline) => set({ timeline }),

      updateCurrentTime: () => set({ currentTime: new Date() }),

      // API actions
      fetchChannels: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get('/channels');
          set({ channels: response.data, isLoading: false });
          
          // Set first enabled channel as current if none selected
          const state = get();
          if (!state.currentChannelId && response.data.length > 0) {
            const firstEnabled = response.data.find((c: Channel) => c.enabled);
            if (firstEnabled) {
              set({ currentChannelId: firstEnabled.youtube_channel_id });
            }
          }
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to fetch channels',
            isLoading: false 
          });
        }
      },

      fetchTimeline: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get('/timeline/current');
          set({ 
            timeline: response.data.timeline,
            currentDate: response.data.date,
            isLoading: false 
          });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to fetch timeline',
            isLoading: false 
          });
        }
      },

      toggleChannel: async (channelId, enabled) => {
        try {
          await api.put(`/channels/${channelId}/toggle`, { enabled });
          const channels = get().channels.map(c => 
            c.id === channelId ? { ...c, enabled } : c
          );
          set({ channels });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to toggle channel'
          });
        }
      },

      refreshTimeline: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/timeline/regenerate');
          set({ 
            timeline: response.data.timeline,
            currentDate: response.data.date,
            isLoading: false 
          });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to refresh timeline',
            isLoading: false 
          });
        }
      },

      setShowMiniPlayer: (show) => set({ showMiniPlayer: show }),

      setChannelSwitchMode: (mode) => set({ channelSwitchMode: mode }),

      setPlayerLayout: (layout) => set({ playerLayout: layout }),
    }),
    {
      name: 'youtube-tv-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        currentChannelId: state.currentChannelId,
        channelSwitchMode: state.channelSwitchMode,
      }),
    }
  )
);

// Update current time every second
if (typeof window !== 'undefined') {
  const timeUpdateInterval = setInterval(() => {
    useTVStore.getState().updateCurrentTime();
  }, 1000);
  window.addEventListener('beforeunload', () => clearInterval(timeUpdateInterval));
}