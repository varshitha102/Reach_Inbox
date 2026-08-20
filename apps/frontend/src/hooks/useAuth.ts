import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ['session'],
    queryFn: authApi.getSession,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      window.location.href = '/login';
    },
  });

  return {
    user,
    isLoading,
    error,
    refetch,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
