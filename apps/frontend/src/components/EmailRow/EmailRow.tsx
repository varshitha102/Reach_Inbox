import { Clock, Send } from 'lucide-react';
import { format } from 'date-fns';

interface EmailRowProps {
  recipient: string;
  subject: string;
  preview: string;
  scheduledAt?: string;
  sentAt?: string;
  status: 'scheduled' | 'sent';
  onClick: () => void;
}

const stripHtml = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export function EmailRow({
  recipient,
  subject,
  preview,
  scheduledAt,
  sentAt,
  status,
  onClick,
}: EmailRowProps) {
  const isScheduled = status === 'scheduled';
  const date = isScheduled ? scheduledAt : sentAt;
  const formattedDate = date ? format(new Date(date), 'MMM d, h:mm a') : '';
  const plainPreview = stripHtml(preview);

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium flex-shrink-0">
        {recipient.charAt(0).toUpperCase()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">{recipient}</p>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {isScheduled ? (
              <Clock className="w-4 h-4 text-gray-400" />
            ) : (
              <Send className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-xs text-gray-500">{formattedDate}</span>
          </div>
        </div>
        
        <p className="text-sm font-medium text-gray-900 mb-1 truncate w-[70%]">{subject}</p>
        <p className="text-sm text-gray-500 truncate w-[70%]">{plainPreview}</p>
      </div>
    </div>
  );
}
