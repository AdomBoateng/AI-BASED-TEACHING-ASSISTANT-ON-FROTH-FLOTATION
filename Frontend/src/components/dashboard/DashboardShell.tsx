'use client';

import { Sidebar } from '@/components/sidebar/Sidebar';
import { Header } from '@/components/common/Header';
import { useUIStore } from '@/store/uiStore';

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="h-dvh overflow-hidden bg-background flex">

      {/* Sidebar (fixed — never scrolls with content) */}
      <aside
        className={`
          fixed left-0 top-0 z-40 h-dvh w-60
          border-r border-border/40 bg-sidebar
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar />
      </aside>

      {/* Main column */}
      <div
        className={`
          flex flex-1 flex-col h-dvh min-w-0 transition-all duration-300
          ${sidebarOpen ? 'md:ml-60' : 'ml-0'}
        `}
      >
        {/* Sticky Header */}
        <Header />

        {/* Content area */}
        <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}