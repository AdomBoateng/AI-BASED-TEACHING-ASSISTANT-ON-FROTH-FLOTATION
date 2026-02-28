// FILE PATH: src/components/chat/ChatContainer.tsx
// FINAL VERSION: Fixed sidebar, sticky header, scrolling messages

'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Header } from '@/components/common/Header';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';

export function ChatContainer() {
  const [mounted, setMounted] = useState(false);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
    if (isMobile) setSidebarOpen(false);
  }, []); // eslint-disable-line

  if (!mounted) return null;

  return (
    // Root container: full viewport height, no overflow
    <div className="flex h-dvh bg-background overflow-hidden">

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - FIXED on mobile, STATIC on desktop
          Uses transform for smooth slide animation on mobile */}
      <aside
        className={`
          fixed md:static top-0 left-0 h-dvh z-30
          w-60 flex-shrink-0 border-r border-border/40 bg-sidebar
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar />
      </aside>

      {/* Main content area */}
      <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
        
        {/* STICKY HEADER - stays at top when scrolling */}
        <Header />

        {/* Chat wrapper - takes remaining space */}
        <div className="flex flex-1 flex-col min-h-0">
          {/* MessageList scrolls internally */}
          <MessageList />
          
          {/* Input area always at bottom */}
          <InputArea />
        </div>

      </main>
    </div>
  );
}