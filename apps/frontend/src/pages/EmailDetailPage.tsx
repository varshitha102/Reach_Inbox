import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { emailJobsApi } from '../api/emailJobs';
import { ArrowLeft, Star, Paperclip, Clock, Send, Mail, Download } from 'lucide-react';
import { LoadingState } from '../components/LoadingState/LoadingState';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { useState } from 'react';
import DOMPurify from 'dompurify';

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);

  console.log('=== EMAIL DETAIL PAGE DEBUG ===');
  console.log('Email ID from URL:', id);

  const { data: emailJob, isLoading, error, refetch } = useQuery({
    queryKey: ['email-job', id],
    queryFn: () => emailJobsApi.getById(id!),
    enabled: !!id,
    retry: false,
  });

  console.log('Query state:', { isLoading, error, hasData: !!emailJob });
  if (emailJob) {
    console.log('Email job data received:', JSON.stringify({
      id: emailJob.id,
      subject: emailJob.subject,
      recipient: emailJob.recipient,
      status: emailJob.status,
      hasAttachments: !!emailJob.attachments,
      attachmentsCount: emailJob.attachments?.length || 0,
      attachments: emailJob.attachments
    }, null, 2));
  }
  console.log('=== END EMAIL DETAIL PAGE DEBUG ===');

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading email"
        description="Failed to load email. Please try again."
        action={
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (!emailJob) {
    return (
      <EmptyState
        title="Email not found"
        description="The email you're looking for doesn't exist or you don't have permission to view it."
        action={
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg"
          >
            Go Back
          </button>
        }
      />
    );
  }

  const isScheduled = emailJob.status === 'SCHEDULED';
  const date = isScheduled ? emailJob.scheduledAt : emailJob.sentAt;
  const formattedDate = date ? new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) : '';

  // Sanitize HTML
  const sanitizedBody = DOMPurify.sanitize(emailJob.body || '', {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'img', 'div', 'span'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  });

  const getAttachmentIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
      return { icon: 'image', color: 'from-purple-400 to-purple-600' };
    }
    if (ext === 'pdf') {
      return { icon: 'pdf', color: 'from-red-400 to-red-600' };
    }
    if (['txt', 'csv'].includes(ext || '')) {
      return { icon: 'text', color: 'from-blue-400 to-blue-600' };
    }
    return { icon: 'file', color: 'from-gray-400 to-gray-600' };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 break-words">{emailJob.subject}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isScheduled ? 'Scheduled' : 'Sent'} • {formattedDate}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <Star className="w-5 h-5 text-gray-400 hover:text-yellow-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <Download className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Sender Info */}
          <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-200">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-md">
                {emailJob.recipient?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{emailJob.recipient}</p>
                    <p className="text-sm text-gray-500">{emailJob.recipient}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
                    {isScheduled ? (
                      <>
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">Scheduled</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Sent</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="w-4 h-4" />
                  <span>To: {emailJob.recipient}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Clock className="w-4 h-4" />
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email Body */}
          <div className="bg-white rounded-2xl p-8 mb-6 shadow-sm border border-gray-200">
            <div
              className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-green-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-em:text-gray-700 break-words"
              dangerouslySetInnerHTML={{ __html: sanitizedBody }}
            />
          </div>

          {/* Attachments */}
          {emailJob.attachments && emailJob.attachments.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900 text-lg">Attachments ({emailJob.attachments.length})</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {emailJob.attachments.map((attachment: any) => {
                  const { color } = getAttachmentIcon(attachment.filename);
                  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(attachment.filename.split('.').pop()?.toLowerCase() || '');
                  
                  return (
                    <div
                      key={attachment.id}
                      className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer border border-gray-200 hover:border-green-300 group"
                      onClick={() => setSelectedAttachment(attachment)}
                    >
                      <div className="aspect-square bg-white rounded-lg overflow-hidden border border-gray-100">
                        {isImage && attachment.url ? (
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${color} rounded-lg flex items-center justify-center`}>
                            <Paperclip className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
                          <p className="text-xs text-gray-500">
                            {attachment.size ? formatFileSize(attachment.size) : 'Unknown size'}
                          </p>
                        </div>
                        <Download className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Info */}
          {emailJob.lastError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">!</span>
                </div>
                <h3 className="font-semibold text-red-900 text-lg">Delivery Error</h3>
              </div>
              <p className="text-sm text-red-700">{emailJob.lastError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Attachment Preview Modal */}
      {selectedAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedAttachment.filename}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedAttachment.size ? formatFileSize(selectedAttachment.size) : 'Unknown size'}
                </p>
              </div>
              <button
                onClick={() => setSelectedAttachment(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto flex items-center justify-center bg-gray-50 rounded-xl p-4">
              {['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(selectedAttachment.filename.split('.').pop()?.toLowerCase() || '') ? (
                <img
                  src={selectedAttachment.url}
                  alt={selectedAttachment.filename}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                />
              ) : selectedAttachment.filename.split('.').pop()?.toLowerCase() === 'pdf' ? (
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Paperclip className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-2">PDF Preview</p>
                  <p className="text-sm text-gray-500 mb-4">Click to download or view the PDF</p>
                  <a
                    href={selectedAttachment.url}
                    download={selectedAttachment.filename}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    Download PDF
                  </a>
                </div>
              ) : ['txt', 'csv'].includes(selectedAttachment.filename.split('.').pop()?.toLowerCase() || '') ? (
                <div className="w-full">
                  <div className="bg-white rounded-xl p-6 border border-gray-200 max-h-[60vh] overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {selectedAttachment.preview || 'Preview not available'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Paperclip className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-2">File Preview</p>
                  <p className="text-sm text-gray-500 mb-4">Preview not available for this file type</p>
                  <a
                    href={selectedAttachment.url}
                    download={selectedAttachment.filename}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
