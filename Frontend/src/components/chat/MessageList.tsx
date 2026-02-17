'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { UserMessage } from './UserMessage';
import { AIResponse } from './AIResponse';
import { ScrollArea } from '@/components/ui/scroll-area';

export function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <ScrollArea className="h-full w-full">
      <div className="flex flex-col gap-4 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start by sending a message below.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={message.id} className="animate-fade-in">
              {message.role === 'user' ? (
                <UserMessage message={message} />
              ) : (
                <AIResponse messageId={message.id} />
              )}
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
