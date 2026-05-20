import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { Guide } from './pages/Guide';
import { Watch } from './pages/Watch';
import { Settings } from './pages/Settings';
import { useTVStore } from './store/useTVStore';
import { api } from './api/client';
import { VideoPlayerProvider } from './contexts/VideoPlayerContext';
import { GlobalVideoPlayer } from './components/VideoPlayer/GlobalVideoPlayer';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useTVStore();
  return token ? <>{children}</> : <Navigate to="/auth" replace />;
}

function App() {
  // Initialize auth token from persisted state
  useEffect(() => {
    const token = useTVStore.getState().token;
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);
  return (
    <VideoPlayerProvider>
      <Router>
        {/* Global video player - persists across all routes */}
        <GlobalVideoPlayer />

        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/guide"
            element={
              <ProtectedRoute>
                <Guide />
              </ProtectedRoute>
            }
          />
          <Route
            path="/watch"
            element={
              <ProtectedRoute>
                <Watch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/guide" replace />} />
        </Routes>
      </Router>
    </VideoPlayerProvider>
  );
}

export default App
