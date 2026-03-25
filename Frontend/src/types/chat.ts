export type TutorMode = 'learn' | 'practice' | 'review';
export type ResponseFormat = 'text' | 'video';

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  responseFormat?: ResponseFormat;
  videoUrl?: string | null;
  audioUrl?: string | null;
  mode: TutorMode;
  timestamp: Date;

  // ── Mode-session specific ──────────────────────────────────────────────────
  // Set on the assistant message that carries an evaluation result
  evaluation?: PracticeEvaluation | ReviewEvaluation | null;
  // 'prompt'      → first message of a mode session (scenario / question)
  // 'evaluation'  → feedback on a student answer
  // 'completed'   → final summary / key points
  // undefined     → regular learn-mode message
  messageType?: 'prompt' | 'evaluation' | 'completed';
  // For practice completion
  keyLearningPoints?: string[];
  // For review evaluation
  nextDifficulty?: string;
  // Step tracking (practice: 1-3, review: 1-10)
  step?: number;
  totalSteps?: number;
}

export interface PracticeEvaluation {
  verdict: 'correct' | 'partial' | 'incorrect';
  score: number;
  feedback: string;
  missing_points: string[];
  unsupported_claims: string[];
}

export interface ReviewEvaluation {
  verdict: 'correct' | 'partial' | 'incorrect';
  score: number;
  rubric_level: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Unsatisfactory';
  feedback: string;
  missing_points: string[];
  unsupported_claims: string[];
  // Present for MCQ and fill_blank item types
  correct_answer?: string;
}

export interface Session {
  id: string;
  title: string;
  mode: TutorMode;
  currentMode?: TutorMode;
  prefersVideo: boolean;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  previewMessage?: string;
  startedAt?: string;
  endedAt?: string | null;
}

export interface VideoResponse {
  videoUrl: string;
  audioUrl?: string;
  duration: number;
  subtitles: Subtitle[];
}

export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

// ─── Mode session config (stored in chatStore) ────────────────────────────────
export interface ActiveModeSession {
  modeSessionId: string;
  mode: 'practice' | 'review';
  sessionType: string;
  difficulty: string;
  currentStep: number;
  totalSteps: number;
  completed: boolean;
}