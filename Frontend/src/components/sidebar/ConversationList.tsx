'use client';

import { useChatStore } from '@/store/chatStore';
import { Trash2, MessageSquare, BookOpen, FlaskConical, ClipboardCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const modeIcon = {
  learn: BookOpen,
  practice: FlaskConical,
  review: ClipboardCheck,
};

export function ConversationList() {
  const sessions = useChatStore((s) => s.sessions);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const setCurrentSession = useChatStore((s) => s.setCurrentSession);
  const deleteSession = useChatStore((s) => s.deleteSession);

  const handleSelect = (id: string) => {
    if (id !== currentSessionId) setCurrentSession(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(id);
    toast.success('Session deleted');
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <MessageSquare className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground/60">No sessions yet</p>
        <p className="text-[11px] text-muted-foreground/40">Start a new session above</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 py-1">
      {sessions.map((session) => {
        const isActive = session.id === currentSessionId;
        const Icon = modeIcon[session.mode] ?? BookOpen;
        const timeAgo = formatDistanceToNow(new Date(session.createdAt), { addSuffix: true });

        return (
          <div
            key={session.id}
            role="button"
            tabIndex={0}
            onClick={() => handleSelect(session.id)}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect(session.id)}
            className={`group relative w-full text-left rounded-lg px-3 py-2.5 transition-colors cursor-pointer ${
              isActive
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            {/* Active left-bar indicator */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r bg-primary" />
            )}

            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />

              <div className="flex-1 min-w-0">
                {/* Title = first user message, truncated to one line */}
                <p className="text-xs font-medium truncate leading-tight">
                  {session.title}
                </p>
                {/* Subtitle = always relative time — never a message preview */}
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {timeAgo}
                </p>
              </div>

              {/* Delete — only visible on hover */}
              <button
                onClick={(e) => handleDelete(session.id, e)}
                className="flex-shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive transition-all"
                title="Delete session"
                aria-label="Delete session"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}