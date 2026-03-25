'use client';

import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ModeSelector } from '@/components/mode/ModeSelector';
import { useChat } from '@/hooks/use-chat';
import { BookOpen, FlaskConical, ClipboardCheck, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_STARTS = [
  'What is froth flotation and how does it work?',
  'Explain the role of collectors in flotation.',
  'How does pH affect flotation performance?',
  'What causes froth instability?',
];

const MODE_CARDS = [
  {
    mode: 'learn' as const,
    icon: BookOpen,
    label: 'Learn',
    desc: 'Explanations & concepts',
    color: 'text-blue-400',
    bg: 'hover:bg-blue-500/5 hover:border-blue-500/30',
  },
  {
    mode: 'practice' as const,
    icon: FlaskConical,
    label: 'Practice',
    desc: 'Guided 3-step scenarios',
    color: 'text-emerald-400',
    bg: 'hover:bg-emerald-500/5 hover:border-emerald-500/30',
  },
  {
    mode: 'review' as const,
    icon: ClipboardCheck,
    label: 'Review',
    desc: 'Adaptive quiz questions',
    color: 'text-amber-400',
    bg: 'hover:bg-amber-500/5 hover:border-amber-500/30',
  },
];

export function ChatContainer() {
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const isCreatingSession = useChatStore((s) => s.isCreatingSession);
  const isStartingModeSession = useChatStore((s) => s.isStartingModeSession);

  const { sendMessage, startModeSession, startNewSession } = useChat();

  const [clickedQuickStart, setClickedQuickStart] = useState<string | null>(null);
  const [modeSelectorTarget, setModeSelectorTarget] = useState<'practice' | 'review' | null>(null);

  const showWelcome = !currentSessionId && !isCreatingSession;

  const handleQuickStart = async (question: string) => {
    setClickedQuickStart(question);
    await sendMessage(question, 'learn');
    setClickedQuickStart(null);
  };

  const handleModeCardClick = async (mode: 'learn' | 'practice' | 'review') => {
    if (mode === 'learn') {
      // Learn mode: just start a session, the first message will kick it off
      await startNewSession(undefined, 'learn');
      return;
    }
    // Practice / Review: show modal to pick session type + difficulty
    // Ensure we have a session first
    if (!currentSessionId) {
      const session = await startNewSession(undefined, mode);
      if (!session) return;
    }
    setModeSelectorTarget(mode);
  };

  const handleModeStart = async (
    mode: 'practice' | 'review',
    sessionType: string,
    difficulty: 'Basic' | 'Intermediate' | 'Advanced'
  ) => {
    await startModeSession(mode, sessionType, difficulty);
    setModeSelectorTarget(null);
  };

  if (showWelcome) {
    return (
      <>
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

            {/* Mode cards — clickable */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {MODE_CARDS.map(({ mode, icon: Icon, label, desc, color, bg }) => (
                <button
                  key={label}
                  onClick={() => handleModeCardClick(mode)}
                  disabled={isCreatingSession || isStartingModeSession}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card p-4 text-center',
                    'transition-all cursor-pointer',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    bg
                  )}
                >
                  <Icon className={cn('h-5 w-5', color)} />
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{desc}</p>
                </button>
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
                    onClick={() => handleQuickStart(q)}
                    disabled={!!clickedQuickStart}
                    className="flex items-center gap-3 w-full text-left rounded-lg border border-border/40 bg-card/50 px-4 py-3 text-xs text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {clickedQuickStart === q ? (
                      <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-primary" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    )}
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mode selector modal (triggered from mode cards) */}
        {modeSelectorTarget && (
          <ModeSelector
            mode={modeSelectorTarget}
            onStart={handleModeStart}
            onClose={() => setModeSelectorTarget(null)}
            isLoading={isStartingModeSession}
          />
        )}
      </>
    );
  }

  if (isCreatingSession) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Starting session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <MessageList />
      <InputArea />
    </div>
  );
}