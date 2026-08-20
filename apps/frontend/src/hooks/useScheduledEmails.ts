import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailJobsApi } from '../api/emailJobs';

export function useScheduledEmails() {
  const queryClient = useQueryClient();

  const { data: emails, isLoading, error, refetch } = useQuery({
    queryKey: ['scheduled-emails'],
    queryFn: () => emailJobsApi.list('scheduled'),
  });

  const cancelMutation = useMutation({
    mutationFn: emailJobsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
    },
  });

  return {
    emails,
    isLoading,
    error,
    refetch,
    cancelEmail: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
  };
}
