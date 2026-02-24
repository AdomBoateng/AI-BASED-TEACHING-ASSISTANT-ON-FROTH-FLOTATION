'use client';

import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useChatStore } from '@/store/chatStore';

export function Header() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const currentConversationId = useChatStore((state) => state.currentConversationId);
  const conversations = useChatStore((state) => state.conversations);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleSidebar}
            className="hidden sm:inline-flex"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {currentConversation?.title || 'Meraki'}
            </h2>
            <p className="text-xs text-muted-foreground">
              AI Learning Assistant
            </p>
          </div>
        </div>

        <div className="text-right text-sm text-muted-foreground">
          {currentConversation && (
            <p>
              {currentConversation.messages?.length || 0} messages
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
