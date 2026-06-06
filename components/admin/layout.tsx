'use client';

import { AdminSidebar } from './sidebar';
import { AdminTopBar } from './top-bar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950">
      <AdminTopBar />
      <AdminSidebar />
      <main className="ml-64 pt-20">
        {children}
      </main>
    </div>
  );
}
