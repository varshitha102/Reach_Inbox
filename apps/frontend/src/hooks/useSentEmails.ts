import { useQuery } from '@tanstack/react-query';
import { emailJobsApi } from '../api/emailJobs';

export function useSentEmails() {
  const { data: emails, isLoading, error, refetch } = useQuery({
    queryKey: ['sent-emails'],
    queryFn: () => emailJobsApi.list('sent'),
  });

  return {
    emails,
    isLoading,
    error,
    refetch,
  };
}
