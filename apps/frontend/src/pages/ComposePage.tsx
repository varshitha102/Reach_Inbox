import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Paperclip, Send, X, Users } from 'lucide-react';
import { RecipientInput } from '../components/RecipientInput/RecipientInput';
import { RichTextEditor } from '../components/RichTextEditor/RichTextEditor';
import { emailJobsApi } from '../api/emailJobs';
import { sendersApi } from '../api/senders';
import { uploadsApi } from '../api/uploads';
import SenderSelector from '../components/SenderSelector/SenderSelector';

export default function ComposePage() {
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    senderId: '',
    subject: '',
    body: '',
    scheduledAt: '',
    delayMs: 1000,
    hourlyLimit: 1000,
    dailyLimit: 10000,
  });
  const [customSenderEmail, setCustomSenderEmail] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{ content: string; metadata: { name: string; size: number; type: string; rowCount: number; validCount: number; invalidCount: number; duplicateCount: number } } | null>(null);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Map<number, string>>(new Map());

  const { data: senders } = useQuery({
    queryKey: ['senders'],
    queryFn: sendersApi.list,
  });

  const { data: defaultSender } = useQuery({
    queryKey: ['default-sender'],
    queryFn: sendersApi.getDefault,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => emailJobsApi.bulkCreate(data),
    onSuccess: () => {
      alert('Emails scheduled successfully!');
      navigate('/dashboard/scheduled');
    },
    onError: (error: any) => {
      console.error('Failed to schedule emails:', error);
      
      let message = 'Failed to schedule emails';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'object') {
        message = JSON.stringify(error);
      } else {
        message = String(error);
      }
      
      alert(message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (recipients.length === 0) {
      alert('Please add at least one recipient');
      return;
    }

    const senderId = formData.senderId === 'custom' ? customSenderEmail : formData.senderId;
    
    if (!senderId) {
      alert('Please select or enter a sender email');
      return;
    }

    // Upload attachments first
    let attachmentData: any[] = [];
    if (attachments.length > 0) {
      try {
        console.log('Uploading attachments:', attachments);
        attachmentData = await Promise.all(
          attachments.map(file => uploadsApi.uploadFile(file))
        );
        console.log('Attachments uploaded successfully:', attachmentData);
      } catch (error) {
        console.error('Failed to upload attachments:', error);
        alert('Failed to upload attachments. Please try again.');
        return;
      }
    }

    const payload: any = {
      senderId,
      recipients,
      subject: formData.subject,
      body: formData.body,
      delayMs: formData.delayMs,
      minDelayBetweenEmails: formData.delayMs,
      hourlyLimit: formData.hourlyLimit,
      dailyLimit: formData.dailyLimit,
    };

    // Add uploaded attachments if any
    if (attachmentData.length > 0) {
      payload.attachments = attachmentData;
      console.log('Adding uploaded attachments to payload:', attachmentData);
    }

    // Only include scheduledAt if it's a valid non-empty datetime
    if (formData.scheduledAt && formData.scheduledAt.trim() !== '') {
      const date = new Date(formData.scheduledAt);
      if (!Number.isNaN(date.getTime())) {
        payload.scheduledAt = date.toISOString();
      }
    }

    console.log('SCHEDULING PAYLOAD:', JSON.stringify(payload, null, 2));
    console.log('scheduledAt:', payload.scheduledAt);
    console.log('scheduledAt type:', typeof payload.scheduledAt);
    console.log('scheduledAt valid:', payload.scheduledAt ? !Number.isNaN(new Date(payload.scheduledAt).getTime()) : false);
    
    createMutation.mutate(payload);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Generate file preview with metadata
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        
        // Parse CSV/TXT for emails
        const lines = content.split(/[\n\r]/).filter(line => line.trim());
        const allEmails = lines.map(line => {
          const parts = line.split(/[,;\t]/);
          return parts.find(part => part.includes('@'))?.trim() || '';
        }).filter(email => email);
        
        const uniqueEmails = [...new Set(allEmails)];
        const duplicateCount = allEmails.length - uniqueEmails.length;
        const validEmails = uniqueEmails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        const invalidEmails = uniqueEmails.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        
        setFilePreview({
          content,
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            rowCount: lines.length,
            validCount: validEmails.length,
            invalidCount: invalidEmails.length,
            duplicateCount,
          }
        });
        
        // Set recipients from valid emails
        setRecipients(validEmails);
      };
      reader.readAsText(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachments([...attachments, ...newFiles]);
      
      // Generate previews for each file
      newFiles.forEach((file, index) => {
        const fileIndex = attachments.length + index;
        
        if (file.type.startsWith('image/')) {
          // Image preview
          const reader = new FileReader();
          reader.onload = (event) => {
            setAttachmentPreviews(prev => new Map(prev).set(fileIndex, event.target?.result as string));
          };
          reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
          // PDF preview - use browser's native PDF viewer
          const reader = new FileReader();
          reader.onload = (event) => {
            setAttachmentPreviews(prev => new Map(prev).set(fileIndex, event.target?.result as string));
          };
          reader.readAsDataURL(file);
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          // TXT preview
          const reader = new FileReader();
          reader.onload = (event) => {
            setAttachmentPreviews(prev => new Map(prev).set(fileIndex, event.target?.result as string));
          };
          reader.readAsText(file);
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          // CSV preview
          const reader = new FileReader();
          reader.onload = (event) => {
            setAttachmentPreviews(prev => new Map(prev).set(fileIndex, event.target?.result as string));
          };
          reader.readAsText(file);
        }
      });
    }
  };

  const handleAddCustomSender = (email: string) => {
    setCustomSenderEmail(email);
    setFormData({ ...formData, senderId: 'custom' });
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
    setAttachmentPreviews(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">New Email</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAttachmentModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {createMutation.isPending ? 'Scheduling...' : 'Send Later'}
            </button>
          </div>
        </div>
      </div>


      {/* Form */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* From & Recipients */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">From</label>
              <SenderSelector
                senders={senders || []}
                defaultSender={defaultSender || undefined}
                selectedSender={formData.senderId}
                onSelect={(senderId) => setFormData({ ...formData, senderId })}
                onAddCustom={handleAddCustomSender}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">To</label>
              <RecipientInput recipients={recipients} onChange={setRecipients} />
              
              {/* CSV/TXT File Upload for Recipients */}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-blue-200 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-blue-700"
                >
                  <Users className="w-4 h-4" />
                  Import Recipients from CSV/TXT
                </label>
                {uploadedFile && filePreview && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-lg">
                    <span className="text-sm text-blue-700">{filePreview.metadata.name}</span>
                    <span className="text-xs text-blue-600">({(filePreview.metadata.size / 1024).toFixed(1)} KB)</span>
                    <span className="text-xs text-green-600 font-medium">{filePreview.metadata.validCount} valid</span>
                    {filePreview.metadata.invalidCount > 0 && (
                      <span className="text-xs text-red-600 font-medium">{filePreview.metadata.invalidCount} invalid</span>
                    )}
                    <button type="button" onClick={removeFile} className="text-blue-400 hover:text-blue-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Subject"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              required
            />
          </div>

          {/* Scheduling Settings - Compact Row */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Delay (ms)</label>
              <input
                type="number"
                value={formData.delayMs}
                onChange={(e) => setFormData({ ...formData, delayMs: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                min="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Hourly Limit</label>
              <input
                type="number"
                value={formData.hourlyLimit}
                onChange={(e) => setFormData({ ...formData, hourlyLimit: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                min="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Daily Limit</label>
              <input
                type="number"
                value={formData.dailyLimit}
                onChange={(e) => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                min="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Schedule</label>
              <input
                type="datetime-local"
                value={formData.scheduledAt || ''}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="flex-1">
            <RichTextEditor content={formData.body} onChange={(content) => setFormData({ ...formData, body: content })} />
          </div>

          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Paperclip className="w-4 h-4" />
                <span>{attachments.length} file{attachments.length > 1 ? 's' : ''} attached</span>
                <button
                  type="button"
                  onClick={() => setShowAttachmentModal(true)}
                  className="text-green-600 hover:text-green-700 text-sm"
                >
                  Manage
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => {
                  const preview = attachmentPreviews.get(index);
                  const isImage = file.type.startsWith('image/');
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 group"
                    >
                      {isImage && preview ? (
                        <img
                          src={preview}
                          alt={file.name}
                          className="w-10 h-10 object-cover rounded border border-gray-200"
                        />
                      ) : (
                        <Paperclip className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700 truncate max-w-[120px]">{file.name}</span>
                      <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachments(attachments.filter((_, i) => i !== index));
                        }}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* File Preview Modal */}
      {showAttachmentModal && uploadedFile && filePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{filePreview.metadata.name}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>Size: {(filePreview.metadata.size / 1024).toFixed(1)} KB</span>
                  <span>Type: {filePreview.metadata.type || 'text/plain'}</span>
                  <span>Rows: {filePreview.metadata.rowCount}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Email Stats */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Valid: {filePreview.metadata.validCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Invalid: {filePreview.metadata.invalidCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Duplicates: {filePreview.metadata.duplicateCount}</span>
              </div>
            </div>
            
            {/* CSV Table Preview */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">Row</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">Email</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filePreview.content.split(/[\n\r]/).filter(line => line.trim()).map((line, index) => {
                    const parts = line.split(/[,;\t]/);
                    const email = parts.find(part => part.includes('@'))?.trim() || '';
                    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-600">{index + 1}</td>
                        <td className="px-4 py-2 text-gray-700">{email || '-'}</td>
                        <td className="px-4 py-2">
                          {isValid ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Valid</span>
                          ) : email ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Invalid</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">No Email</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Modal */}
      {showAttachmentModal && !uploadedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Attachments</h2>
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
              <input
                type="file"
                multiple
                onChange={handleAttachmentUpload}
                className="hidden"
                id="attachment-upload"
              />
              <label
                htmlFor="attachment-upload"
                className="cursor-pointer"
              >
                <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to upload files</p>
              </label>
            </div>
            
            {attachments.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-3">
                {attachments.map((file, index) => {
                  const preview = attachmentPreviews.get(index);
                  const isImage = file.type.startsWith('image/');
                  const isPdf = file.type === 'application/pdf';
                  const isText = file.type === 'text/plain' || file.name.endsWith('.txt');
                  const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 bg-white">
                        {isImage && preview ? (
                          <img src={preview} alt={file.name} className="max-w-full max-h-64 mx-auto rounded" />
                        ) : isPdf && preview ? (
                          <div className="space-y-2">
                            <object
                              data={preview}
                              type="application/pdf"
                              className="w-full h-64 rounded border"
                              title={file.name}
                            >
                              <div className="text-center text-gray-500 py-8">
                                <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm">PDF preview not available</p>
                                <a
                                  href={preview}
                                  download={file.name}
                                  className="text-green-600 hover:text-green-700 text-sm mt-2 inline-block"
                                >
                                  Download PDF
                                </a>
                              </div>
                            </object>
                            <a
                              href={preview}
                              download={file.name}
                              className="text-sm text-green-600 hover:text-green-700 block text-center"
                            >
                              Download PDF
                            </a>
                          </div>
                        ) : isText && preview ? (
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-64 overflow-y-auto">
                            {preview}
                          </pre>
                        ) : isCsv && preview ? (
                          <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Row</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Content</th>
                                </tr>
                              </thead>
                              <tbody>
                                {preview.split(/[\n\r]/).filter(line => line.trim()).map((line, i) => (
                                  <tr key={i} className="border-b">
                                    <td className="px-3 py-2 text-gray-600">{i + 1}</td>
                                    <td className="px-3 py-2 text-gray-700">{line}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm">No preview available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
