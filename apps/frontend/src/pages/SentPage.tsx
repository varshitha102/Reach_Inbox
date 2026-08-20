import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, CheckCircle, Paperclip, X } from 'lucide-react';
import { LoadingState } from '../components/LoadingState/LoadingState';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { emailJobsApi, CampaignGroup } from '../api/emailJobs';

export default function SentPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignGroup | null>(null);
  const [page, setPage] = useState(1);

  const handleEmailClick = (emailId: string) => {
    navigate(`/email/${emailId}`);
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: campaigns, isLoading, error, refetch } = useQuery({
    queryKey: ['sent-campaigns', debouncedSearchQuery],
    queryFn: () => emailJobsApi.listCampaigns('SENT'),
    retry: false,
  });

  const { data: response } = useQuery({
    queryKey: ['sent-emails', page],
    queryFn: () => emailJobsApi.list('SENT', page),
    retry: false,
  });

  const emails = response?.emails || [];
  const pagination = response?.pagination;

  const filteredGroups = campaigns?.filter((group: CampaignGroup) =>
    group.subject.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  ) || [];
  const hasMore = pagination && page < pagination.totalPages;

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <EmptyState
        title="No sent emails"
        description="You have no sent emails yet"
      />
    );
  }

  if (!filteredGroups || filteredGroups.length === 0) {
    return (
      <EmptyState
        title="No sent emails"
        description={searchQuery ? 'No emails match your search' : 'You have no sent emails yet'}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Sent</h1>
          {pagination && campaigns && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pagination.total} emails • {campaigns.length} campaigns
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
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
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
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
                    <div className="text-xs font-medium text-green-600">
                      {firstEmail?.sentAt ? new Date(firstEmail.sentAt).toLocaleDateString() : 'Sent'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {firstEmail?.sentAt ? new Date(firstEmail.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {hasMore && (
          <div className="py-4 text-center border-t border-gray-100">
            <button
              onClick={() => setPage(prev => prev + 1)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
            >
              Load more
            </button>
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
                <p className="text-sm text-gray-500 mt-1">{selectedCampaign.count} emails sent</p>
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
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{email.recipient?.split('@')[0] || email.recipient}</p>
                          <p className="text-xs text-gray-500">{email.subject}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {email.sentAt ? new Date(email.sentAt).toLocaleString() : ''}
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
