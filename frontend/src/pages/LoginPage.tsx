import { useState } from 'react'
import { motion } from 'framer-motion'
import { GoogleLogin } from '@react-oauth/google'
import { Sparkles, Mic, Brain, TrendingUp, Shield } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { authApi } from '@/lib/api'

const features = [
  { icon: Mic, label: 'Voice-First AI', desc: 'Talk naturally, get real-time feedback' },
  { icon: Brain, label: 'Smart Coaching', desc: 'Grammar, vocabulary & pronunciation' },
  { icon: TrendingUp, label: 'Track Progress', desc: 'See your improvement over time' },
  { icon: Shield, label: 'Interview Prep', desc: 'Practice with realistic scenarios' },
]

export function LoginPage() {
  const { setUser, setTokens } = useAuthStore()
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(false)

  const handleGoogleSuccess = async (credential: string) => {
    setLoading(true)
    try {
      const response = await authApi.googleLogin(credential)
      const { user, accessToken, refreshToken } = response.data.data
      setTokens(accessToken, refreshToken)
      setUser(user)
    } catch (err) {
      console.error(err)
      addToast('error', 'Login Failed', 'Could not sign in with Google. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-eva-bg flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] p-12 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-eva-accent/5 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-eva-purple/5 blur-[100px] pointer-events-none" />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-eva-accent to-eva-purple opacity-90" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-eva-accent to-eva-purple blur-md opacity-50" />
            <Sparkles size={18} className="absolute inset-0 m-auto text-white" />
          </div>
          <span className="text-2xl font-bold text-gradient">Eva</span>
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-5xl font-bold leading-tight text-eva-text mb-4">
              Your Personal<br />
              <span className="text-gradient">AI Communication</span><br />
              Mentor
            </h1>
            <p className="text-lg text-eva-text-dim max-w-md leading-relaxed">
              Improve your spoken English, build confidence, and ace interviews through natural voice conversations with Eva.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-eva-border/30"
              >
                <div className="w-8 h-8 rounded-lg bg-eva-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon size={15} className="text-eva-accent" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-eva-text">{f.label}</p>
                  <p className="text-xs text-eva-text-muted mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="text-xs text-eva-text-muted">
          © 2025 Eva AI · Privacy · Terms
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-eva-surface/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-eva-accent to-eva-purple" />
              <Sparkles size={16} className="absolute inset-0 m-auto text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">Eva</span>
          </div>

          <div className="glass-panel rounded-2xl p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-eva-text mb-2">Welcome to Eva</h2>
              <p className="text-sm text-eva-text-dim">Sign in to start your learning journey</p>
            </div>

            {/* Eva core mini preview */}
            <div className="flex justify-center mb-8">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-eva-accent/20 to-eva-purple/20 blur-xl" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-eva-accent to-eva-purple opacity-80 animate-breathe" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                {/* Orbit rings */}
                <div className="absolute inset-0 rounded-full border border-eva-accent/30 animate-spin-slow" />
                <div className="absolute inset-1 rounded-full border border-eva-purple/20" style={{ animation: 'spin 12s linear infinite reverse' }} />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center">
                <div className="flex items-center gap-3 text-eva-text-dim text-sm">
                  <svg className="animate-spin h-5 w-5 text-eva-accent" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing you in...
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(res) => {
                    if (res.credential) handleGoogleSuccess(res.credential)
                  }}
                  onError={() => addToast('error', 'Login Failed', 'Google sign-in was cancelled.')}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="continue_with"
                  width="260"
                />
              </div>
            )}

            <p className="text-xs text-eva-text-muted text-center mt-6">
              By signing in, you agree to our{' '}
              <span className="text-eva-accent cursor-pointer hover:underline">Terms</span> and{' '}
              <span className="text-eva-accent cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
