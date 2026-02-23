'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { UserMessage } from './UserMessage';
import { AIResponse } from './AIResponse';
import { LoadingState } from './LoadingState';
import { BookOpen } from 'lucide-react';

export function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const isLoadingMessage = useChatStore((s) => s.isLoadingMessage);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingMessage]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <BookOpen className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="text-base font-medium text-foreground">Ready to learn</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Ask a question about froth flotation to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    // FIX: flex-1 min-h-0 overflow-y-auto is the scroll fix.
    // flex-1 takes remaining space, min-h-0 allows shrinking below content
    // size (critical in flex columns), overflow-y-auto enables the scrollbar.
    // No ScrollArea wrapper needed — native overflow is more reliable here.
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-3xl flex flex-col gap-6 px-4 py-6">
        {messages.map((message) => (
          <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {message.role === 'user' ? (
              <UserMessage message={message} />
            ) : (
              <AIResponse message={message} />
            )}
          </div>
        ))}

        {isLoadingMessage && (
          <div className="animate-in fade-in duration-200">
            <LoadingState />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}