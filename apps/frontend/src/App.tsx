import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authApi } from './api/auth';
import { api } from './lib/api';
import LoginPage from './pages/LoginPage';
import { DashboardLayout } from './components/DashboardLayout/DashboardLayout';
import ScheduledPage from './pages/ScheduledPage';
import SentPage from './pages/SentPage';
import ComposePage from './pages/ComposePage';
import EmailDetailPage from './pages/EmailDetailPage';
import { LoadingState } from './components/LoadingState/LoadingState';

function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      api.setToken(token);
      // Small delay to ensure token is set before navigation
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    } else {
      navigate('/login');
    }
  }, [location, navigate]);

  return <LoadingState />;
}

function App() {
  const location = useLocation();
  const isAuthCallback = location.pathname === '/auth/callback';

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['session'],
    queryFn: authApi.getSession,
    retry: false,
    // Don't run session check if we're on auth callback page
    enabled: !isAuthCallback,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Navigate to="/dashboard/scheduled" replace />} />
        <Route path="/dashboard/scheduled" element={<ScheduledPage />} />
        <Route path="/dashboard/sent" element={<SentPage />} />
      </Route>
      
      <Route path="/compose" element={<ComposePage />} />
      <Route path="/email/:id" element={<EmailDetailPage />} />
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
