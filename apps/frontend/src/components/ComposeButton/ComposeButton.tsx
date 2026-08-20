import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

export function ComposeButton() {
  return (
    <Link
      to="/compose"
      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
    >
      <Plus className="w-5 h-5" />
      <span>Compose</span>
    </Link>
  );
}
