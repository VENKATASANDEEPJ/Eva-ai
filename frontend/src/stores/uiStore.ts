import { create } from 'zustand'
import type { Toast, ToastType } from '@/types'

interface UIState {
  // Navigation
  sidebarOpen: boolean
  activePage: string

  // Modals
  settingsOpen: boolean
  interviewSetupOpen: boolean
  practiceSetupOpen: boolean
  reportModalOpen: boolean
  reportSessionId: string | null

  // Toasts
  toasts: Toast[]

  // Theme / Effects
  particlesEnabled: boolean
  soundEnabled: boolean

  // Actions
  setSidebarOpen: (open: boolean) => void
  setActivePage: (page: string) => void
  setSettingsOpen: (open: boolean) => void
  setInterviewSetupOpen: (open: boolean) => void
  setPracticeSetupOpen: (open: boolean) => void
  setReportModalOpen: (open: boolean, sessionId?: string | null) => void
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => void
  removeToast: (id: string) => void
  setParticlesEnabled: (enabled: boolean) => void
  setSoundEnabled: (enabled: boolean) => void
}

let toastCounter = 0

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activePage: 'home',
  settingsOpen: false,
  interviewSetupOpen: false,
  practiceSetupOpen: false,
  reportModalOpen: false,
  reportSessionId: null,
  toasts: [],
  particlesEnabled: true,
  soundEnabled: true,

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setActivePage: (activePage) => set({ activePage }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setInterviewSetupOpen: (interviewSetupOpen) => set({ interviewSetupOpen }),
  setPracticeSetupOpen: (practiceSetupOpen) => set({ practiceSetupOpen }),

  setReportModalOpen: (reportModalOpen: boolean, reportSessionId: string | null = null) =>
    set({ reportModalOpen, reportSessionId }),

  addToast: (type, title, message, duration = 4000) => {
    const id = `toast-${++toastCounter}`
    set((state) => ({
      toasts: [...state.toasts, { id, type, title, message, duration }],
    }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setParticlesEnabled: (particlesEnabled) => set({ particlesEnabled }),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
}))
