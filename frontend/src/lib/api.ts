import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─── Axios Instance ────────────────────────────────────────────────────────────

export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request Interceptor ───────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor ─────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = useAuthStore.getState().refreshToken
        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
            refreshToken,
          })
          const { accessToken, refreshToken: newRefreshToken } = response.data.data
          useAuthStore.getState().setTokens(accessToken, newRefreshToken)
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
          }
          return api(originalRequest)
        }
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  googleLogin: (credential: string) =>
    api.post('/auth/google', { credential }),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get('/auth/me'),

  updateSettings: (settings: Record<string, unknown>) =>
    api.patch('/auth/settings', settings),
}

// ─── Sessions API ─────────────────────────────────────────────────────────────

export const sessionsApi = {
  create: (data: { mode: string; practiceType?: string; interviewRole?: string }) =>
    api.post('/sessions', data),

  getById: (id: string) => api.get(`/sessions/${id}`),

  list: (page = 1, pageSize = 20) =>
    api.get('/sessions', { params: { page, pageSize } }),

  end: (id: string, durationSeconds: number) =>
    api.patch(`/sessions/${id}/end`, { durationSeconds }),

  addMessage: (sessionId: string, data: { role: string; content: string; corrections?: unknown[]; vocabulary?: unknown[] }) =>
    api.post(`/sessions/${sessionId}/messages`, data),
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

export const chatApi = {
  sendMessage: (sessionId: string, content: string) =>
    api.post('/chat/message', { sessionId, content }),

  streamMessage: (sessionId: string, content: string) =>
    api.post('/chat/stream', { sessionId, content }, { responseType: 'stream' }),

  generateSpeech: (text: string, voice?: string) =>
    api.post('/tts/generate', { text, voice }, { responseType: 'blob' }),

  transcribe: (audioBlob: Blob) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    return api.post('/stt/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ─── Interview API ─────────────────────────────────────────────────────────────

export const interviewApi = {
  start: (role: string) => api.post('/interview/start', { role }),

  getNextQuestion: (sessionId: string) =>
    api.get(`/interview/${sessionId}/next-question`),

  submitAnswer: (sessionId: string, questionId: string, answer: string) =>
    api.post(`/interview/${sessionId}/answer`, { questionId, answer }),

  generateReport: (sessionId: string) =>
    api.post(`/interview/${sessionId}/report`),

  getReport: (sessionId: string) =>
    api.get(`/interview/${sessionId}/report`),

  listReports: (page = 1) =>
    api.get('/interview/reports', { params: { page } }),
}

// ─── Progress API ─────────────────────────────────────────────────────────────

export const progressApi = {
  getOverview: () => api.get('/progress/overview'),

  getDaily: (days = 30) => api.get('/progress/daily', { params: { days } }),

  getWeekly: (weeks = 12) => api.get('/progress/weekly', { params: { weeks } }),

  getAchievements: () => api.get('/progress/achievements'),

  getVocabulary: () => api.get('/progress/vocabulary'),

  getGrammar: () => api.get('/progress/grammar'),
}
