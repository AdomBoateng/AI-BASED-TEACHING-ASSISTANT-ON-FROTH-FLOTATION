'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertCircle, Trophy } from 'lucide-react';
import type { ReviewEvaluation } from '@/types';

interface ReviewEvalCardProps {
  evaluation: ReviewEvaluation;
  step: number;
  totalSteps: number;
  nextDifficulty?: string;
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
    label: 'Incorrect',
  },
};

const RUBRIC_COLORS: Record<string, string> = {
  Excellent: 'text-emerald-400',
  Good: 'text-blue-400',
  Satisfactory: 'text-amber-400',
  'Needs Improvement': 'text-orange-400',
  Unsatisfactory: 'text-red-400',
};

export function ReviewEvalCard({
  evaluation,
  step,
  totalSteps,
  nextDifficulty,
}: ReviewEvalCardProps) {
  const meta = VERDICT_META[evaluation.verdict];
  const Icon = meta.icon;
  const scorePercent = Math.round(evaluation.score * 100);
  const rubricColor = RUBRIC_COLORS[evaluation.rubric_level] ?? 'text-muted-foreground';

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', meta.bg, `ring-1 ${meta.ring}`)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', meta.color)} />
          <span className={cn('text-base font-semibold', meta.color)}>{meta.label}</span>
          {evaluation.rubric_level && (
            <span className={cn('text-xs font-medium', rubricColor)}>
              · {evaluation.rubric_level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', meta.bg, meta.color)}>
            {scorePercent}%
          </span>
          <span className="text-xs text-muted-foreground">
            Q{step}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1.5 w-full rounded-full bg-black/20">
        <div
          className={cn(
            'h-1.5 rounded-full transition-all duration-500',
            meta.color.replace('text-', 'bg-')
          )}
          style={{ width: `${scorePercent}%` }}
        />
      </div>

      {/* Feedback */}
      <p className="text-base text-foreground leading-relaxed">{evaluation.feedback}</p>

      {/* Correct answer — shown for MCQ / fill_blank when backend provides it */}
      {evaluation.correct_answer && (
        <div className="rounded-lg bg-background/50 border border-border/40 px-3 py-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
            Correct Answer
          </p>
          <p className="text-base text-foreground font-medium">{evaluation.correct_answer}</p>
        </div>
      )}

      {/* Missing points */}
      {evaluation.missing_points?.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Missing Points
          </p>
          <ul className="space-y-1">
            {evaluation.missing_points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next difficulty indicator */}
      {nextDifficulty && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
          <span className="text-sm text-muted-foreground">Next question difficulty:</span>
          <span className="text-sm font-semibold text-foreground">{nextDifficulty}</span>
        </div>
      )}
    </div>
  );
}

// ── Review completion summary ─────────────────────────────────────────────────

interface ReviewCompletedCardProps {
  totalSteps: number;
}

export function ReviewCompletedCard({ totalSteps }: ReviewCompletedCardProps) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 ring-1 ring-amber-500/20 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-400" />
        <span className="text-base font-semibold text-amber-400">Review Complete 🎓</span>
      </div>
      <p className="text-base text-foreground leading-relaxed">
        You completed all {totalSteps} questions. Great work!
      </p>
    </div>
  );
}