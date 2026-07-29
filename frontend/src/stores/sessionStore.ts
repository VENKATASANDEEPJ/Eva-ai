import { create } from 'zustand'
import type {
  SessionStatus,
  SessionMode,
  Message,
  ConversationSession,
  InterviewRole,
  PracticeType,
  SessionScores,
  SessionFeedback,
} from '@/types'

interface SessionState {
  // Current session
  activeSession: ConversationSession | null
  status: SessionStatus
  mode: SessionMode | null

  // Voice state
  isRecording: boolean
  isSpeaking: boolean
  isProcessing: boolean
  audioLevel: number
  transcript: string
  interimTranscript: string

  // Messages in current session
  messages: Message[]

  // Session config
  selectedRole: InterviewRole | null
  selectedPracticeType: PracticeType | null
  currentTopic: string

  // Realtime
  evaTyping: boolean
  currentEvaMessage: string

  // Actions
  setStatus: (status: SessionStatus) => void
  setMode: (mode: SessionMode | null) => void
  startSession: (session: ConversationSession) => void
  endSession: () => void
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  setAudioLevel: (level: number) => void
  setTranscript: (transcript: string) => void
  setInterimTranscript: (transcript: string) => void
  setIsRecording: (recording: boolean) => void
  setIsSpeaking: (speaking: boolean) => void
  setIsProcessing: (processing: boolean) => void
  setSelectedRole: (role: InterviewRole | null) => void
  setSelectedPracticeType: (type: PracticeType | null) => void
  setCurrentTopic: (topic: string) => void
  setEvaTyping: (typing: boolean) => void
  setCurrentEvaMessage: (msg: string) => void
  updateSessionFeedback: (feedback: SessionFeedback, scores: SessionScores) => void
  reset: () => void
}

const initialState = {
  activeSession: null,
  status: 'idle' as SessionStatus,
  mode: null,
  isRecording: false,
  isSpeaking: false,
  isProcessing: false,
  audioLevel: 0,
  transcript: '',
  interimTranscript: '',
  messages: [],
  selectedRole: null,
  selectedPracticeType: null,
  currentTopic: '',
  evaTyping: false,
  currentEvaMessage: '',
}

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setMode: (mode) => set({ mode }),

  startSession: (session) =>
    set({
      activeSession: session,
      messages: session.messages || [],
      status: 'idle',
    }),

  endSession: () =>
    set((state) => ({
      activeSession: state.activeSession
        ? { ...state.activeSession, endedAt: new Date().toISOString() }
        : null,
      status: 'idle',
      isRecording: false,
      isSpeaking: false,
      isProcessing: false,
      audioLevel: 0,
      transcript: '',
      interimTranscript: '',
    })),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages]
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        }
      }
      return { messages }
    }),

  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setTranscript: (transcript) => set({ transcript }),
  setInterimTranscript: (interimTranscript) => set({ interimTranscript }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsSpeaking: (isSpeaking) => set({ isSpeaking }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setSelectedRole: (selectedRole) => set({ selectedRole }),
  setSelectedPracticeType: (selectedPracticeType) => set({ selectedPracticeType }),
  setCurrentTopic: (currentTopic) => set({ currentTopic }),
  setEvaTyping: (evaTyping) => set({ evaTyping }),
  setCurrentEvaMessage: (currentEvaMessage) => set({ currentEvaMessage }),

  updateSessionFeedback: (feedback, scores) =>
    set((state) => ({
      activeSession: state.activeSession
        ? { ...state.activeSession, feedback, scores }
        : null,
    })),

  reset: () => set(initialState),
}))
