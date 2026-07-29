import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { ConversationPage } from '@/pages/ConversationPage'
import { InterviewPage } from '@/pages/InterviewPage'
import { PracticePage } from '@/pages/PracticePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { SettingsModal } from '@/components/modals/SettingsModal'
import { authApi } from '@/lib/api'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { isAuthenticated, accessToken, setUser, logout } = useAuthStore()
  const { settingsOpen } = useUIStore()

  // Verify token on app load
  useEffect(() => {
    if (accessToken && isAuthenticated) {
      authApi
        .getMe()
        .then((res) => {
          setUser(res.data.data)
        })
        .catch(() => {
          logout()
        })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="conversation" element={<ConversationPage />} />
            <Route path="interview" element={<InterviewPage />} />
            <Route path="practice" element={<PracticePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>

      <ToastContainer />
      {settingsOpen && <SettingsModal />}
    </>
  )
}
