import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassContainer, LoadingSpinner } from '../components/UI';
import { api } from '../api/client';
import { useTVStore } from '../store/useTVStore';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useTVStore();

  const handleDatabaseLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/login');
      const { token, user } = response.data;
      
      setAuth(token, user);
      navigate('/guide');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login with database user');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleDatabaseLogin();
  }, []);


  if (isLoading) {
    return <LoadingSpinner fullScreen message="Authenticating..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <GlassContainer variant="overlay" className="w-full max-w-md p-8">
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">YouTube TV</h1>
            <p className="text-gray-300">Transform your subscriptions into TV channels</p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="text-sm text-gray-400 space-y-2">
              <p className="text-green-400">📀 Database Mode Active</p>
              <p>Using existing database data - no YouTube API calls</p>
              <p>Loading channels and videos from local database...</p>
            </div>
          </div>
        </div>
      </GlassContainer>
    </div>
  );
};