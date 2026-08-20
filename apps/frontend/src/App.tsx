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
    console.log('=== FRONTEND AUTH CALLBACK DEBUG ===');
    console.log('Current URL:', window.location.href);
    console.log('Pathname:', location.pathname);
    console.log('Search params:', location.search);
    
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    console.log('Token present:', !!token);
    console.log('Token length:', token?.length || 0);
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
    
    if (token) {
      console.log('Setting token in API client');
      api.setToken(token);
      console.log('Token set successfully');
      // Small delay to ensure token is set before navigation
      setTimeout(() => {
        console.log('Navigating to dashboard');
        navigate('/dashboard');
      }, 100);
    } else {
      console.log('No token found, redirecting to login');
      navigate('/login');
    }
    console.log('=== END FRONTEND AUTH CALLBACK DEBUG ===');
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
