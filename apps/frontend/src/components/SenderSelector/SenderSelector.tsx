import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

interface Sender {
  id: string;
  email: string;
  name?: string | null;
}

interface SenderSelectorProps {
  senders: Sender[];
  defaultSender?: { email: string; name?: string };
  selectedSender: string;
  onSelect: (senderId: string) => void;
  onAddCustom: (email: string) => void;
}

export default function SenderSelector({
  senders,
  defaultSender,
  selectedSender,
  onSelect,
  onAddCustom,
}: SenderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const allSenders = [
    ...(defaultSender ? [{ id: 'default', email: defaultSender.email, name: defaultSender.name }] : []),
    ...senders,
  ];

  const selectedSenderData = allSenders.find(s => s.id === selectedSender);

  const handleAddEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      alert('Please enter a valid email address');
      return;
    }
    onAddCustom(newEmail);
    setNewEmail('');
    setShowAddEmail(false);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
      >
        <span className="text-sm text-gray-900">
          {selectedSenderData?.name || selectedSenderData?.email || 'Select sender'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="py-1">
            {allSenders.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500">No senders available</div>
            )}
            
            {defaultSender && (
              <div className="px-3 py-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Suggested</div>
                <button
                  type="button"
                  onClick={() => {
                    onSelect('default');
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedSender === 'default' ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {defaultSender.name || defaultSender.email}
                  {defaultSender.name && (
                    <span className="ml-2 text-gray-400 text-xs">{defaultSender.email}</span>
                  )}
                </button>
              </div>
            )}

            {senders.length > 0 && defaultSender && (
              <div className="border-t border-gray-100 my-1" />
            )}

            {senders.map((sender) => (
              <button
                key={sender.id}
                type="button"
                onClick={() => {
                  onSelect(sender.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedSender === sender.id ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {sender.name || sender.email}
                {sender.name && (
                  <span className="ml-2 text-gray-400 text-xs">{sender.email}</span>
                )}
              </button>
            ))}

            <div className="border-t border-gray-100 my-1" />

            {showAddEmail ? (
              <div className="px-3 py-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEmail(false);
                      setNewEmail('');
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddEmail(true)}
                className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add email
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
