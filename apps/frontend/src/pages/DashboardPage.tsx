import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { emailJobsApi } from '../api/emailJobs';
import { authApi } from '../api/auth';
import { EmailJob } from '../types';
import { Mail, Clock, Send, Plus, Search, RefreshCw, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('sent');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user } = useQuery({
    queryKey: ['session'],
    queryFn: authApi.getSession,
  });

  const { data: stats } = useQuery({
    queryKey: ['email-jobs-stats'],
    queryFn: emailJobsApi.getStats,
  });

  const { data: emailJobsData, isLoading, refetch } = useQuery({
    queryKey: ['email-jobs', activeTab],
    queryFn: () => emailJobsApi.list(activeTab === 'scheduled' ? 'SCHEDULED' : 'SENT'),
  });

  const emailJobs = emailJobsData?.emails || [];

  const handleLogout = async () => {
    await authApi.logout();
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      const results = await emailJobsApi.search(searchQuery);
      // Handle search results - in a real app, you'd update state
      console.log('Search results:', results);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary-600 p-2 rounded-lg">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl">ReachInbox</span>
        </div>

        {/* User Profile */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt={user.name || ''} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center">
                <span className="text-primary-700 font-medium">
                  {user?.name?.charAt(0) || user?.email?.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Compose Button */}
        <Link
          to="/compose"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors mb-8"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Compose</span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'scheduled'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <span>Scheduled</span>
            </div>
            {stats?.scheduled && stats.scheduled > 0 && (
              <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-sm">
                {stats.scheduled}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'sent'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5" />
              <span>Sent</span>
            </div>
            {stats?.sent && stats.sent > 0 && (
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-sm">
                {stats.sent}
              </span>
            )}
          </button>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === 'scheduled' ? 'Scheduled Emails' : 'Sent Emails'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Email List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : emailJobs && emailJobs.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {emailJobs.map((emailJob: EmailJob) => (
              <Link
                key={emailJob.id}
                to={`/email/${emailJob.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-500">To: {emailJob.recipient}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          emailJob.status === 'SENT'
                            ? 'bg-green-100 text-green-700'
                            : emailJob.status === 'SCHEDULED'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {emailJob.status}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 truncate">{emailJob.subject}</p>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {emailJob.body.substring(0, 100)}...
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 ml-4">
                    {new Date(emailJob.scheduledAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No emails found</p>
          </div>
        )}
      </div>
    </div>
  );
}
