import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';

export function AppShell() {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
