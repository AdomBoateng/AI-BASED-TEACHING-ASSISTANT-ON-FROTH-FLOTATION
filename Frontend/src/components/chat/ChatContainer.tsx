'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Header } from '@/components/common/Header';
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
  const [mounted, setMounted] = useState(false);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const isMobile = useIsMobile();
  const { sendMessage } = useChat();

  useEffect(() => {
    setMounted(true);
    if (isMobile) setSidebarOpen(false);
  }, []); // eslint-disable-line

  if (!mounted) return null;

  const showWelcome = !currentSessionId;

  return (
    // Root: h-screen keeps everything at viewport height, overflow-hidden prevents page scroll
    <div className="flex h-screen overflow-hidden bg-background">
      
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          flex-shrink-0 overflow-hidden border-r border-border/40
          transition-[width] duration-300 ease-in-out
          ${isMobile ? 'fixed left-0 top-0 h-full z-30' : 'relative'}
          ${sidebarOpen ? 'w-60' : 'w-0'}
        `}
      >
        <div className={`h-full w-60 transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <Sidebar />
        </div>
      </aside>

      {/* Main area - min-h-0 is CRITICAL for nested scroll to work */}
      <main className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        <Header />

        {showWelcome ? (
          // Welcome screen
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 overflow-y-auto">
            <div className="w-full max-w-xl text-center">
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
        ) : (
          /* Active chat wrapper
             CRITICAL: min-h-0 allows MessageList to shrink and scroll internally.
             Without it, this div grows to fit content and scroll never triggers.
          */
          <div className="flex flex-1 flex-col min-h-0">
            <MessageList />
            <InputArea />
          </div>
        )}
      </main>
    </div>
  );
}