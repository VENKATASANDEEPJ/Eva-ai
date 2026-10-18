import { useState } from "react";
import { motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import {
  Sparkles,
  Mic,
  Brain,
  TrendingUp,
  Shield,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { authApi, api } from "@/lib/api";

const features = [
  {
    icon: Mic,
    label: "Voice-First AI",
    desc: "Talk naturally, get real-time feedback",
  },
  {
    icon: Brain,
    label: "Smart Coaching",
    desc: "Grammar, vocabulary & pronunciation",
  },
  {
    icon: TrendingUp,
    label: "Track Progress",
    desc: "See your improvement over time",
  },
  {
    icon: Shield,
    label: "Interview Prep",
    desc: "Practice with realistic scenarios",
  },
];

export function LoginPage() {
  const { setUser, setTokens } = useAuthStore();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // ── Google sign-in ─────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credential: string) => {
    setLoading(true);
    try {
      const response = await authApi.googleLogin(credential);
      const { user, accessToken, refreshToken } = response.data.data;
      setTokens(accessToken, refreshToken);
      setUser(user);
    } catch {
      addToast(
        "error",
        "Google Login Failed",
        "Could not sign in. Make sure your Google Client ID is configured — or use Demo mode below.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Demo sign-in ───────────────────────────────────────────────────────────
  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const res = await api.post("/auth/demo");
      const { user, accessToken, refreshToken } = res.data.data;
      setTokens(accessToken, refreshToken);
      setUser(user);
      addToast(
        "success",
        "Demo Mode Active",
        "You are signed in as a demo user.",
      );
    } catch {
      addToast(
        "error",
        "Demo Login Failed",
        "Make sure the backend is running on port 8000.",
      );
    } finally {
      setDemoLoading(false);
    }
  };

  const busy = loading || demoLoading;

  return (
    <div className="min-h-screen bg-eva-bg flex">
      {/* ── Left branding panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] p-12 relative overflow-hidden">
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
            <Sparkles
              size={18}
              className="absolute inset-0 m-auto text-white"
            />
          </div>
          <span className="text-2xl font-bold text-gradient">Eva</span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-5xl font-bold leading-tight text-eva-text mb-4">
              Your Personal
              <br />
              <span className="text-gradient">AI Communication</span>
              <br />
              Mentor
            </h1>
            <p className="text-lg text-eva-text-dim max-w-md leading-relaxed">
              Improve your spoken English, build confidence, and ace interviews
              through natural voice conversations with Eva.
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
                  <p className="text-xs font-semibold text-eva-text">
                    {f.label}
                  </p>
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

      {/* ── Right login panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-eva-surface/30">
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
              <Sparkles
                size={16}
                className="absolute inset-0 m-auto text-white"
              />
            </div>
            <span className="text-xl font-bold text-gradient">Eva</span>
          </div>

          <div className="glass-panel rounded-2xl p-8 shadow-2xl space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-eva-text">
                Welcome to Eva
              </h2>
              <p className="text-sm text-eva-text-dim">
                Sign in to start your learning journey
              </p>
            </div>

            {/* Animated orb */}
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-eva-accent/20 to-eva-purple/20 blur-xl" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-eva-accent to-eva-purple opacity-80 animate-breathe" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                <div className="absolute inset-0 rounded-full border border-eva-accent/30 animate-spin-slow" />
                <div
                  className="absolute inset-1 rounded-full border border-eva-purple/20"
                  style={{ animation: "spin 12s linear infinite reverse" }}
                />
              </div>
            </div>

            {busy ? (
              /* Loading spinner */
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 size={24} className="animate-spin text-eva-accent" />
                <p className="text-sm text-eva-text-dim">
                  {demoLoading ? "Starting demo…" : "Signing you in…"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* ── Demo login — primary CTA ─────────────────────────── */}
                <button
                  onClick={handleDemoLogin}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl
                             bg-eva-accent hover:bg-eva-accent-bright text-white font-medium text-sm
                             transition-all duration-200 active:scale-95"
                  style={{ boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}
                >
                  <FlaskConical size={16} />
                  Continue as Demo
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-eva-border/50" />
                  <span className="text-xs text-eva-text-muted">
                    or sign in with Google
                  </span>
                  <div className="flex-1 h-px bg-eva-border/50" />
                </div>

                {/* ── Google login ──────────────────────────────────────── */}
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={(res) => {
                      if (res.credential) handleGoogleSuccess(res.credential);
                    }}
                    onError={() =>
                      addToast(
                        "error",
                        "Google Login Failed",
                        "OAuth not configured yet. Use Demo mode above.",
                      )
                    }
                    theme="filled_black"
                    shape="pill"
                    size="large"
                    text="continue_with"
                    width="260"
                  />
                </div>
              </div>
            )}

            {/* Footer note */}
            <p className="text-xs text-eva-text-muted text-center">
              Demo mode lets you explore all features instantly.{" "}
              <span className="text-eva-accent">No account needed.</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
