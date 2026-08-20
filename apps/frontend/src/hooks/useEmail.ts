import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailJobsApi } from '../api/emailJobs';

export function useEmail(id: string) {
  const queryClient = useQueryClient();

  const { data: email, isLoading, error, refetch } = useQuery({
    queryKey: ['email-job', id],
    queryFn: () => emailJobsApi.getById(id),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: emailJobsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-job', id] });
    },
  });

  return {
    email,
    isLoading,
    error,
    refetch,
    cancelEmail: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
  };
}
