import { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface RecipientInputProps {
  recipients: string[];
  onChange: (recipients: string[]) => void;
  placeholder?: string;
}

export function RecipientInput({ recipients, onChange, placeholder = 'Add recipients...' }: RecipientInputProps) {
  const [input, setInput] = useState('');
  const [displayCount, setDisplayCount] = useState(10);
  const inputRef = useRef<HTMLInputElement>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const displayedRecipients = recipients.slice(0, displayCount);
  const hasMore = recipients.length > displayCount;

  const addRecipient = (email: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail && emailRegex.test(trimmedEmail) && !recipients.includes(trimmedEmail)) {
      onChange([...recipients, trimmedEmail]);
      setInput('');
    }
  };

  const removeRecipient = (email: string) => {
    onChange(recipients.filter((r) => r !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient(input);
    } else if (e.key === 'Backspace' && !input && recipients.length > 0) {
      removeRecipient(recipients[recipients.length - 1]);
    }
  };

  const handleBlur = () => {
    if (input) {
      addRecipient(input);
    }
  };

  const handleShowMore = () => {
    const nextCount = displayCount + 10;
    setDisplayCount(nextCount);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 border border-gray-300 rounded-lg bg-white min-h-[48px]">
      {displayedRecipients.map((email) => (
        <div
          key={email}
          className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
        >
          <span>{email}</span>
          <button
            onClick={() => removeRecipient(email)}
            className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={handleShowMore}
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          +{recipients.length - displayCount} more
        </button>
      )}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="flex-1 min-w-[200px] outline-none text-sm"
      />
    </div>
  );
}
