// ─── Core User Types ──────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  lastActiveAt: string
  settings: UserSettings
  stats: UserStats
}

export interface UserSettings {
  preferredVoice: VoiceOption
  speechRate: number
  autoListen: boolean
  soundEffects: boolean
  nativeLanguage: string
  targetLevel: EnglishLevel
  focusAreas: FocusArea[]
  notifications: boolean
}

export interface UserStats {
  totalSessions: number
  totalSpeakingMinutes: number
  currentStreak: number
  longestStreak: number
  wordsLearned: number
  sessionsThisWeek: number
  averageScore: number
}

export type EnglishLevel = 'beginner' | 'elementary' | 'intermediate' | 'upper-intermediate' | 'advanced' | 'proficient'
export type VoiceOption = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
export type FocusArea = 'pronunciation' | 'grammar' | 'vocabulary' | 'fluency' | 'confidence' | 'interview'

// ─── Session & Conversation Types ─────────────────────────────────────────────

export type SessionMode = 'conversation' | 'interview' | 'practice'
export type SessionStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused'

export interface ConversationSession {
  id: string
  userId: string
  mode: SessionMode
  practiceType?: PracticeType
  interviewRole?: InterviewRole
  startedAt: string
  endedAt?: string
  durationSeconds: number
  messages: Message[]
  feedback?: SessionFeedback
  scores?: SessionScores
}

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'eva'
  content: string
  audioUrl?: string
  timestamp: string
  corrections?: GrammarCorrection[]
  vocabulary?: VocabularyNote[]
}

export interface GrammarCorrection {
  original: string
  corrected: string
  explanation: string
  rule: string
}

export interface VocabularyNote {
  word: string
  definition: string
  example: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface SessionFeedback {
  summary: string
  strengths: string[]
  improvements: string[]
  suggestions: string[]
}

export interface SessionScores {
  grammar: number
  vocabulary: number
  fluency: number
  confidence: number
  communication: number
  pronunciation: number
  technical?: number
  overall: number
}

// ─── Interview Types ───────────────────────────────────────────────────────────

export type InterviewRole =
  | 'software_engineer'
  | 'frontend_developer'
  | 'backend_developer'
  | 'fullstack_developer'
  | 'data_scientist'
  | 'hr'
  | 'behavioral'

export interface InterviewSession extends ConversationSession {
  role: InterviewRole
  questions: InterviewQuestion[]
  report?: InterviewReport
}

export interface InterviewQuestion {
  id: string
  question: string
  category: 'technical' | 'behavioral' | 'situational' | 'hr'
  difficulty: 'easy' | 'medium' | 'hard'
  userAnswer?: string
  feedback?: string
  score?: number
}

export interface InterviewReport {
  sessionId: string
  role: InterviewRole
  scores: SessionScores & { technical: number }
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  questionFeedback: QuestionFeedback[]
  overallSummary: string
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no'
  generatedAt: string
}

export interface QuestionFeedback {
  questionId: string
  question: string
  answer: string
  score: number
  feedback: string
  betterAnswer?: string
}

// ─── Practice Types ────────────────────────────────────────────────────────────

export type PracticeType =
  | 'casual_conversation'
  | 'storytelling'
  | 'public_speaking'
  | 'debate_practice'
  | 'office_english'
  | 'travel_english'
  | 'presentation_practice'
  | 'vocabulary_builder'
  | 'grammar_practice'

export interface PracticeSession extends ConversationSession {
  practiceType: PracticeType
  topic?: string
  targetSkills: string[]
}

// ─── Progress & Analytics Types ───────────────────────────────────────────────

export interface ProgressData {
  daily: DailyProgress[]
  weekly: WeeklyProgress[]
  vocabulary: VocabularyProgress
  grammar: GrammarProgress
  achievements: Achievement[]
  streak: StreakData
}

export interface DailyProgress {
  date: string
  speakingMinutes: number
  sessionsCount: number
  averageScore: number
  wordsLearned: number
}

export interface WeeklyProgress {
  weekStart: string
  weekEnd: string
  totalMinutes: number
  averageScore: number
  improvement: number
  dominantMode: SessionMode
}

export interface VocabularyProgress {
  totalWords: number
  wordsThisWeek: number
  byDifficulty: { easy: number; medium: number; hard: number }
  recentWords: VocabularyNote[]
}

export interface GrammarProgress {
  accuracy: number
  accuracyTrend: number
  commonMistakes: { rule: string; count: number; example: string }[]
  recentCorrections: GrammarCorrection[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earnedAt?: string
  progress: number
  target: number
  unlocked: boolean
}

export interface StreakData {
  current: number
  longest: number
  thisWeek: boolean[]
  lastActiveDate: string
}

// ─── Voice & Audio Types ───────────────────────────────────────────────────────

export interface VoiceState {
  status: SessionStatus
  isRecording: boolean
  isSpeaking: boolean
  isProcessing: boolean
  audioLevel: number
  transcript: string
  interimTranscript: string
}

export interface AudioConfig {
  sampleRate: number
  channels: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  badge?: number
}

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export interface ModalState {
  isOpen: boolean
  type: string | null
  props?: Record<string, unknown>
}
