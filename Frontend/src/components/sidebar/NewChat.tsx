'use client';

import { Button } from '@/components/ui/button';
import { SquarePen } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';

export function NewChat() {
  const { startNewSession, currentSessionId, messages } = useChat();

  const handleNewChat = () => {
    // Don't create a duplicate empty session if one already exists with no messages
    if (currentSessionId && messages.length === 0) return;
    startNewSession();
  };

  return (
    <Button
      onClick={handleNewChat}
      variant="outline"
      className="w-full justify-start gap-2 h-9 text-xs font-medium border-border/60 hover:bg-muted/60"
    >
      <SquarePen className="h-3.5 w-3.5" />
      New session
    </Button>
  );
}