'use client';

import { useChatStore } from '@/store/chatStore';
// import { Button } from '@/components/ui/button';
import { Trash2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { apiClient } from '@/services/api';

export function ConversationList() {
  const conversations = useChatStore((state) => state.conversations);
  const currentConversationId = useChatStore((state) => state.currentConversationId);
  const setCurrentConversation = useChatStore((state) => state.setCurrentConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const setMessages = useChatStore((state) => state.setMessages);

  const handleSelectConversation = (id: string) => {
    setCurrentConversation(id);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await apiClient.deleteConversation(id);

      if (response.success) {
        deleteConversation(id);
        if (currentConversationId === id) {
          setCurrentConversation(null);
          setMessages([]);
        }
        toast.success('Conversation deleted');
      }
    } catch (error) {
      toast.error('Failed to delete conversation');
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          onClick={() => handleSelectConversation(conversation.id)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
            currentConversationId === conversation.id
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{conversation.title}</p>
              <p className="text-xs opacity-75">
                {format(new Date(conversation.createdAt), 'MMM d, HH:mm')}
              </p>
            </div>
            <button
              onClick={(e) => handleDeleteConversation(conversation.id, e)}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
              title="Delete conversation"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
