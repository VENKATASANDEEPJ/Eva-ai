import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserStats, UserSettings } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: unknown) => void; // accepts raw API response (any casing)
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

// ── Normalise API response → frontend User type ───────────────────────────────
// The backend now sends camelCase, but persisted localStorage may have old
// snake_case keys. This handles both so nothing crashes after an upgrade.

function normaliseStats(raw: Record<string, unknown>): UserStats {
  const n = (k1: string, k2: string) => Number(raw[k1] ?? raw[k2] ?? 0) || 0;
  return {
    totalSessions: n("totalSessions", "total_sessions"),
    totalSpeakingMinutes: n("totalSpeakingMinutes", "total_speaking_minutes"),
    currentStreak: n("currentStreak", "current_streak"),
    longestStreak: n("longestStreak", "longest_streak"),
    wordsLearned: n("wordsLearned", "words_learned"),
    sessionsThisWeek: n("sessionsThisWeek", "sessions_this_week"),
    averageScore: n("averageScore", "average_score"),
  };
}

function normaliseSettings(raw: Record<string, unknown>): UserSettings {
  const s = (k1: string, k2: string, fb: unknown) => raw[k1] ?? raw[k2] ?? fb;
  return {
    preferredVoice: String(
      s("preferredVoice", "preferred_voice", "nova"),
    ) as UserSettings["preferredVoice"],
    speechRate: Number(s("speechRate", "speech_rate", 1.0)),
    autoListen: Boolean(s("autoListen", "auto_listen", true)),
    soundEffects: Boolean(s("soundEffects", "sound_effects", true)),
    nativeLanguage: String(s("nativeLanguage", "native_language", "")),
    targetLevel: String(
      s("targetLevel", "target_level", "intermediate"),
    ) as UserSettings["targetLevel"],
    focusAreas: ((s("focusAreas", "focus_areas", []) as string[]) ||
      []) as UserSettings["focusAreas"],
    notifications: Boolean(s("notifications", "notifications", false)),
  };
}

function normaliseUser(raw: unknown): User {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    email: String(r.email ?? ""),
    name: String(r.name ?? ""),
    avatar: r.avatar ? String(r.avatar) : undefined,
    createdAt: String(r.createdAt ?? r.created_at ?? new Date().toISOString()),
    lastActiveAt: String(
      r.lastActiveAt ?? r.last_active_at ?? new Date().toISOString(),
    ),
    settings: normaliseSettings((r.settings ?? {}) as Record<string, unknown>),
    stats: normaliseStats((r.stats ?? {}) as Record<string, unknown>),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (raw) =>
        set({ user: normaliseUser(raw), isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "eva-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
