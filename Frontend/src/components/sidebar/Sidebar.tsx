'use client';

import { ConversationList } from './ConversationList';
import { NewChat } from './NewChat';
import { SidebarMenu } from './SidebarMenu';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Sidebar() {
  return (
    <div className="flex flex-col h-full bg-secondary text-secondary-foreground">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">Meraki</h1>
        <p className="text-xs text-muted-foreground">AI Learning Assistant</p>
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-b border-border">
        <NewChat />
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <ConversationList />
        </div>
      </ScrollArea>

      <Separator />

      {/* Menu */}
      <div className="p-4 border-t border-border">
        <SidebarMenu />
      </div>
    </div>
  );
}
