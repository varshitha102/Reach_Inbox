import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Trash2, X, Clock, Paperclip } from 'lucide-react';
import { LoadingState } from '../components/LoadingState/LoadingState';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { emailJobsApi, CampaignGroup } from '../api/emailJobs';

export default function ScheduledPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignGroup | null>(null);
  const queryClient = useQueryClient();

  const handleEmailClick = (emailId: string) => {
    navigate(`/email/${emailId}`);
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ['scheduled-campaigns', debouncedSearchQuery],
    queryFn: () => emailJobsApi.listCampaigns('SCHEDULED'),
    retry: false,
  });

  const { data: response } = useQuery({
    queryKey: ['scheduled-emails'],
    queryFn: () => emailJobsApi.list('SCHEDULED'),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (campaignId: string) => emailJobsApi.deleteByCampaign(campaignId),
    onSuccess: () => {
      alert('Campaign deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduled-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
    },
    onError: (error: any) => {
      alert(`Failed to delete campaign: ${error.message || 'Unknown error'}`);
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => emailJobsApi.deleteAllScheduled(),
    onSuccess: () => {
      alert('All scheduled emails deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduled-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
    },
    onError: (error: any) => {
      alert(`Failed to delete all: ${error.message || 'Unknown error'}`);
    },
  });

  const emails = response?.emails || [];
  const pagination = response?.pagination;

  const filteredGroups = campaigns?.filter((group: CampaignGroup) =>
    group.subject.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <EmptyState
        title="No scheduled emails"
        description="You have no scheduled emails yet"
      />
    );
  }

  if (!filteredGroups || filteredGroups.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Scheduled</h1>
            {pagination && campaigns && (
              <p className="text-sm text-gray-500">
                {pagination.total} total emails • {campaigns.length} campaigns
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(`Delete all ${pagination?.total || 0} scheduled emails? This will stop all pending email sends.`)) {
                  deleteAllMutation.mutate();
                }
              }}
              disabled={deleteAllMutation.isPending}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
            >
              Delete All
            </button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm w-64"
              />
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['scheduled-campaigns'] })}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <EmptyState
          title="No scheduled emails"
          description={searchQuery ? 'No emails match your search' : 'You have no scheduled emails yet'}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Scheduled</h1>
          {pagination && campaigns && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pagination.total} emails • {campaigns.length} campaigns
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm(`Delete all ${pagination?.total || 0} scheduled emails?`)) {
                deleteAllMutation.mutate();
              }
            }}
            disabled={deleteAllMutation.isPending}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Delete All
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm w-56"
            />
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['scheduled-campaigns'] })}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState
            title="Error loading emails"
            description="Failed to load scheduled emails. Please try again."
            action={
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['scheduled-campaigns'] })}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Retry
              </button>
            }
          />
        ) : !filteredGroups || filteredGroups.length === 0 ? (
          <EmptyState
            title="No scheduled emails"
            description={searchQuery ? 'No emails match your search' : 'You have no scheduled emails yet.'}
            action={
              <button
                onClick={() => navigate('/compose')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Compose New Email
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredGroups.map((group: CampaignGroup) => {
              const firstEmail = emails.find((e: any) => e.campaignId === group.campaignId);
              const bodyPreview = firstEmail?.body?.replace(/<[^>]*>/g, '').substring(0, 80) || '';
              const username = firstEmail?.recipient?.split('@')[0] || firstEmail?.recipient || 'Multiple';
              
              return (
                <div
                  key={group.campaignId}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => setSelectedCampaign(group)}
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">To: {username}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{group.count} recipient{group.count > 1 ? 's' : ''}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 truncate mb-1">{group.subject}</h3>
                    <p className="text-xs text-gray-500 truncate">{bodyPreview || 'Click to view details'}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-medium text-orange-600">
                        {group.scheduledAt ? new Date(group.scheduledAt).toLocaleDateString() : 'Not scheduled'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {group.scheduledAt ? new Date(group.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${group.count} emails?`)) {
                          deleteMutation.mutate(group.campaignId);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedCampaign.subject}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedCampaign.count} emails scheduled</p>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {emails
                .filter((email: any) => email.campaignId === selectedCampaign.campaignId)
                .map((email: any) => (
                  <div
                    key={email.id}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleEmailClick(email.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{email.recipient?.split('@')[0] || email.recipient}</p>
                          <p className="text-xs text-gray-500">{email.subject}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(email.scheduledAt).toLocaleString()}
                      </div>
                    </div>
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="flex items-center gap-2 ml-11 mt-2">
                        <Paperclip className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}</span>
                        {email.attachments.some((att: any) => att.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && (
                          <div className="flex gap-1">
                            {email.attachments
                              .filter((att: any) => att.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                              .slice(0, 3)
                              .map((att: any, idx: number) => (
                                <img
                                  key={idx}
                                  src={att.url}
                                  alt={att.filename}
                                  className="w-6 h-6 object-cover rounded border border-gray-200"
                                />
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
