// FILE PATH: src/components/chat/ChatContainer.tsx
// COMPLETE: Welcome screen + messages + quick starts

'use client';

import { useChatStore } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { useChat } from '@/hooks/use-chat';
import { BookOpen, FlaskConical, ClipboardCheck, Zap } from 'lucide-react';

const QUICK_STARTS = [
  'What is froth flotation and how does it work?',
  'Explain the role of collectors in flotation.',
  'How does pH affect flotation performance?',
  'What causes froth instability?',
];

export function ChatContainer() {
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const { sendMessage } = useChat();

  const showWelcome = !currentSessionId;

  if (showWelcome) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 overflow-y-auto">
        <div className="w-full max-w-xl text-center py-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Welcome to Meraki
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Your AI tutor for froth flotation. Ask questions, work through scenarios, or test your knowledge.
          </p>

          {/* Mode cards */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: BookOpen, label: 'Learn', desc: 'Explanations & concepts', color: 'text-blue-400' },
              { icon: FlaskConical, label: 'Practice', desc: 'Work through scenarios', color: 'text-emerald-400' },
              { icon: ClipboardCheck, label: 'Review', desc: 'Test your knowledge', color: 'text-amber-400' },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card p-4 text-center"
              >
                <Icon className={`h-5 w-5 ${color}`} />
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{desc}</p>
              </div>
            ))}
          </div>

          {/* Quick starts */}
          <div className="mt-8">
            <p className="mb-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
              Quick starts
            </p>
            <div className="flex flex-col gap-2">
              {QUICK_STARTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q, 'learn')}
                  className="flex items-center gap-3 w-full text-left rounded-lg border border-border/40 bg-card/50 px-4 py-3 text-xs text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground transition-all group"
                >
                  <Zap className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active chat
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <MessageList />
      <InputArea />
    </div>
  );
}