'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { useChatStore } from '@/store/chatStore';
import { VoiceInput } from './VoiceInput';
import { REVIEW_SESSION_TYPES, PRACTICE_SESSION_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Human-readable labels for both modes
const TYPE_LABELS: Record<string, string> = {
  // Review
  mcq:           'Multiple Choice',
  fill_blank:    'Fill in the Blank',
  flashcard:     'Flashcard',
  short_answer:  'Short Answer',
  // Practice
  flotation_basics:  'Flotation Basics',
  reagents:          'Reagents & Chemistry',
  process_variables: 'Process Variables',
  troubleshooting:   'Troubleshooting',
  surface_chemistry: 'Surface Chemistry',
};

// Pill colour per mode
const PILL_STYLES = {
  practice: {
    pill:     'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50',
    dot:      'bg-emerald-400',
    active:   'bg-emerald-500/10',
    activeText: 'text-emerald-400',
    header:   'Switch practice topic',
  },
  review: {
    pill:     'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50',
    dot:      'bg-amber-400',
    active:   'bg-amber-500/10',
    activeText: 'text-amber-400',
    header:   'Switch question type',
  },
};

export function InputArea() {
  const [message, setMessage] = useState('');
  const [showTypeSwitcher, setShowTypeSwitcher] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    sendMessage,
    sendModeMessage,
    switchReviewType,
    switchPracticeType,
    isLoadingMessage,
    isStartingModeSession,
    activeModeSession,
  } = useChat();

  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const sessions = useChatStore((s) => s.sessions);
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const currentMode = currentSession?.currentMode ?? 'learn';

  const inModeSession  = !!activeModeSession && !activeModeSession.completed;
  const isPractice     = inModeSession && activeModeSession?.mode === 'practice';
  const isReview       = inModeSession && activeModeSession?.mode === 'review';
  const showPill       = isPractice || isReview;
  const isSwitching    = isStartingModeSession;

  // Which list to show in the dropdown
  const sessionTypes = isPractice ? PRACTICE_SESSION_TYPES : REVIEW_SESSION_TYPES;
  const pillStyles   = isPractice ? PILL_STYLES.practice : PILL_STYLES.review;

  const placeholder =
    isPractice
      ? 'Type your answer to the guided question…'
      : isReview
      ? 'Type your answer…'
      : 'Ask anything about froth flotation…';

  const handleSend = async () => {
    const text = message.trim();
    if (!text || isLoadingMessage) return;
    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (inModeSession) {
      await sendModeMessage(text);
    } else {
      await sendMessage(text, 'learn');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleVoiceTranscript = (transcript: string) => {
    setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
    textareaRef.current?.focus();
  };

  const handleSwitchType = async (newType: string) => {
    setShowTypeSwitcher(false);
    if (isPractice) {
      await switchPracticeType(newType);
    } else {
      await switchReviewType(newType);
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur px-4 py-3">
      <div className="mx-auto max-w-3xl">

        {/* Progress bar row */}
        {inModeSession && activeModeSession && (
          <div className="mb-2 flex items-center gap-2">

            {/* Type switcher pill — shown for both practice and review */}
            {showPill && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowTypeSwitcher((v) => !v)}
                  disabled={isSwitching || isLoadingMessage}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all',
                    pillStyles.pill,
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isSwitching ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className={cn('h-1.5 w-1.5 rounded-full', pillStyles.dot)} />
                  )}
                  {TYPE_LABELS[activeModeSession.sessionType] ?? activeModeSession.sessionType}
                  <ChevronDown className={cn(
                    'h-3 w-3 transition-transform duration-200',
                    showTypeSwitcher && 'rotate-180'
                  )} />
                </button>

                {/* Dropdown — opens upward */}
                {showTypeSwitcher && (
                  <>
                    {/* Click-away backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowTypeSwitcher(false)}
                    />
                    <div className="absolute bottom-full left-0 z-20 mb-2 w-56 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                      <div className="px-3 py-2 border-b border-border/50">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {pillStyles.header}
                        </p>
                      </div>
                      {sessionTypes.map((type) => {
                        const isActive = activeModeSession.sessionType === type.value;
                        return (
                          <button
                            key={type.value}
                            onClick={() => handleSwitchType(type.value)}
                            disabled={isActive}
                            className={cn(
                              'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                              isActive
                                ? cn('cursor-default', pillStyles.active)
                                : 'hover:bg-muted/60 cursor-pointer'
                            )}
                          >
                            <CheckCircle2 className={cn(
                              'mt-0.5 h-3.5 w-3.5 flex-shrink-0 transition-colors',
                              isActive ? pillStyles.activeText : 'text-transparent'
                            )} />
                            <div className="min-w-0">
                              <p className={cn(
                                'text-xs font-medium',
                                isActive ? pillStyles.activeText : 'text-foreground'
                              )}>
                                {type.label}
                              </p>
                              {'desc' in type && (
                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                  {type.desc}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Progress bar */}
            <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-1 rounded-full transition-all duration-500',
                  activeModeSession.mode === 'practice' ? 'bg-emerald-500' : 'bg-amber-500'
                )}
                style={{
                  width: `${((activeModeSession.currentStep - 1) / activeModeSession.totalSteps) * 100}%`,
                }}
              />
            </div>

            {/* Step counter */}
            <span className="flex-shrink-0 text-[11px] text-muted-foreground">
              {activeModeSession.mode === 'practice' ? 'Step' : 'Q'}{' '}
              {activeModeSession.currentStep}/{activeModeSession.totalSteps}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <VoiceInput onRecordingComplete={handleVoiceTranscript} />

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoadingMessage || isSwitching}
            rows={1}
            className="
              flex-1 resize-none bg-transparent text-sm text-foreground
              placeholder:text-muted-foreground/60
              border-0 outline-none ring-0 shadow-none
              leading-6 py-1 px-2
              min-h-[28px] max-h-[160px]
              disabled:opacity-50
            "
          />

          <Button
            onClick={handleSend}
            disabled={!message.trim() || isLoadingMessage || isSwitching}
            size="icon"
            className="h-8 w-8 rounded-lg flex-shrink-0"
          >
            {isLoadingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/50">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}