'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FlaskConical, ClipboardCheck, X, ChevronRight, Loader2 } from 'lucide-react';
import { SESSION_TYPES, DIFFICULTY_LEVELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { TutorMode } from '@/types';

interface ModeSelectorProps {
  mode: 'practice' | 'review';
  onStart: (
    mode: 'practice' | 'review',
    sessionType: string,
    difficulty: 'Basic' | 'Intermediate' | 'Advanced'
  ) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const MODE_META = {
  practice: {
    icon: FlaskConical,
    label: 'Practice',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
    selectedBg: 'bg-emerald-500/20 border-emerald-500/50',
    description: 'Work through a 3-step guided scenario with detailed feedback.',
  },
  review: {
    icon: ClipboardCheck,
    label: 'Review',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
    selectedBg: 'bg-amber-500/20 border-amber-500/50',
    description: 'Answer up to 10 adaptive quiz questions. Text-only mode.',
  },
};

export function ModeSelector({ mode, onStart, onClose, isLoading = false }: ModeSelectorProps) {
  const [sessionType, setSessionType] = useState<string>(SESSION_TYPES[0].value);
  const [difficulty, setDifficulty] = useState<'Basic' | 'Intermediate' | 'Advanced'>('Basic');

  const meta = MODE_META[mode];
  const Icon = meta.icon;

  const handleStart = async () => {
    await onStart(mode, sessionType, difficulty);
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', meta.bg, `ring-1 ${meta.ring}`)}>
              <Icon className={cn('h-5 w-5', meta.color)} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Start {meta.label}</h2>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Session type */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Topic
            </label>
            <div className="flex flex-col gap-1.5">
              {SESSION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSessionType(type.value)}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-all text-left',
                    sessionType === type.value
                      ? cn('border text-foreground font-medium', meta.selectedBg)
                      : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {type.label}
                  {sessionType === type.value && (
                    <ChevronRight className={cn('h-4 w-4 flex-shrink-0', meta.color)} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Difficulty
            </label>
            <div className="flex gap-2">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-sm font-medium transition-all',
                    difficulty === level
                      ? cn('border text-foreground', meta.selectedBg)
                      : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleStart} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                Start {meta.label}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}