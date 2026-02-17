'use client';

import { useState, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Header } from '@/components/common/Header';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { LoadingState } from './LoadingState';

export function ChatContainer() {
  const [mounted, setMounted] = useState(false);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const isGeneratingVideo = useChatStore((state) => state.isGeneratingVideo);
  const currentConversationId = useChatStore((state) => state.currentConversationId);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-0'
        } border-r border-border`}
      >
        {sidebarOpen && <Sidebar />}
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <Header />

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          {currentConversationId ? (
            <div className="flex h-full flex-col">
              <MessageList />
              {isGeneratingVideo && <LoadingState />}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Welcome to Meraki
                </h1>
                <p className="text-muted-foreground">
                  Start a new conversation to begin learning with AI-powered video responses.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        {currentConversationId && <InputArea />}
      </div>
    </div>
  );
}
