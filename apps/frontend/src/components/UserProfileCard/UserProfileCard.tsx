import { ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function UserProfileCard() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{user.name || 'User'}</p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
      </div>
      <ChevronDown className="w-4 h-4 text-gray-400" />
    </div>
  );
}
