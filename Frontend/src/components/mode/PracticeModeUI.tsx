'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertCircle, BookOpen } from 'lucide-react';
import type { PracticeEvaluation } from '@/types';

interface PracticeEvalCardProps {
  evaluation: PracticeEvaluation;
  step: number;
  totalSteps: number;
}

const VERDICT_META = {
  correct: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
    label: 'Correct',
  },
  partial: {
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
    label: 'Partial Credit',
  },
  incorrect: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/20',
    label: 'Needs Improvement',
  },
};

export function PracticeEvalCard({ evaluation, step, totalSteps }: PracticeEvalCardProps) {
  const meta = VERDICT_META[evaluation.verdict];
  const Icon = meta.icon;
  const scorePercent = Math.round(evaluation.score * 100);

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', meta.bg, `ring-1 ${meta.ring}`)}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', meta.color)} />
          <span className={cn('text-sm font-semibold', meta.color)}>{meta.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Score pill */}
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', meta.bg, meta.color)}>
            {scorePercent}%
          </span>
          {/* Step tracker */}
          <span className="text-xs text-muted-foreground">
            Step {step}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1.5 w-full rounded-full bg-black/20">
        <div
          className={cn('h-1.5 rounded-full transition-all duration-500', meta.color.replace('text-', 'bg-'))}
          style={{ width: `${scorePercent}%` }}
        />
      </div>

      {/* Feedback */}
      <p className="text-sm text-foreground leading-relaxed">{evaluation.feedback}</p>

      {/* Missing points */}
      {evaluation.missing_points?.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Missing Points
          </p>
          <ul className="space-y-1">
            {evaluation.missing_points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Practice completion summary ───────────────────────────────────────────────

interface PracticeCompletedCardProps {
  keyLearningPoints: string[];
  summary: string;
}

export function PracticeCompletedCard({ keyLearningPoints, summary }: PracticeCompletedCardProps) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 ring-1 ring-emerald-500/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-semibold text-emerald-400">Scenario Complete 🎉</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{summary}</p>
      {keyLearningPoints.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Key Learning Points
          </p>
          <ul className="space-y-1.5">
            {keyLearningPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}