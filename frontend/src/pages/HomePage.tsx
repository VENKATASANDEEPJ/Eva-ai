import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MessageCircle,
  Briefcase,
  BookOpen,
  BarChart3,
  Flame,
  Clock,
  Star,
  TrendingUp,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDuration } from '@/lib/utils'

const quickActions = [
  {
    id: 'conversation',
    title: 'Talk to Eva',
    description: 'Start a free-flowing voice conversation',
    icon: MessageCircle,
    color: 'from-eva-accent to-eva-accent-bright',
    glow: 'rgba(99,102,241,0.3)',
    path: '/conversation',
    badge: 'Voice',
  },
  {
    id: 'interview',
    title: 'Interview Practice',
    description: 'Simulate real interview scenarios',
    icon: Briefcase,
    color: 'from-eva-purple to-purple-400',
    glow: 'rgba(168,85,247,0.3)',
    path: '/interview',
    badge: 'Popular',
  },
  {
    id: 'practice',
    title: 'Daily Practice',
    description: 'Focused skill-building exercises',
    icon: BookOpen,
    color: 'from-eva-cyan to-cyan-400',
    glow: 'rgba(34,211,238,0.3)',
    path: '/practice',
    badge: 'New',
  },
  {
    id: 'dashboard',
    title: 'View Progress',
    description: 'Track your improvement journey',
    icon: BarChart3,
    color: 'from-eva-green to-emerald-400',
    glow: 'rgba(16,185,129,0.3)',
    path: '/dashboard',
    badge: null,
  },
]

export function HomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const stats = user?.stats

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-eva-accent/10 via-eva-surface to-eva-purple/5 border border-eva-border/50"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-eva-accent/5 blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-eva-text-muted text-sm mb-1">{greeting()},</p>
          <h1 className="text-3xl font-bold text-eva-text mb-2">
            {user?.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-eva-text-dim">Ready to practice today? Eva is waiting for you.</p>

          <div className="flex flex-wrap gap-3 mt-5">
            {stats && (
              <>
                <StatPill icon={<Flame size={13} className="text-eva-amber" />} value={`${stats.currentStreak} day streak`} />
                <StatPill icon={<Clock size={13} className="text-eva-cyan" />} value={`${formatDuration(stats.totalSpeakingMinutes * 60)} total`} />
                <StatPill icon={<Star size={13} className="text-eva-green" />} value={`${stats.wordsLearned} words learned`} />
                <StatPill icon={<TrendingUp size={13} className="text-eva-purple" />} value={`${stats.averageScore}% avg score`} />
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-eva-text">Quick Start</h2>
          <Zap size={14} className="text-eva-text-muted" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(action.path)}
              className="group relative overflow-hidden rounded-2xl p-5 text-left border border-eva-border/50 bg-eva-surface hover:border-eva-accent/30 transition-all duration-300"
              style={{ boxShadow: `0 0 0 0 ${action.glow}` }}
              whileHover={{ scale: 1.02, boxShadow: `0 8px 32px ${action.glow}` }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

              <div className="relative">
                {action.badge && (
                  <div className="flex justify-end mb-2">
                    <Badge variant={action.badge === 'Popular' ? 'purple' : action.badge === 'Voice' ? 'accent' : 'cyan'}>
                      {action.badge}
                    </Badge>
                  </div>
                )}
                {!action.badge && <div className="h-6 mb-2" />}

                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 opacity-90`}>
                  <action.icon size={20} className="text-white" />
                </div>

                <h3 className="text-sm font-semibold text-eva-text mb-1">{action.title}</h3>
                <p className="text-xs text-eva-text-muted leading-relaxed">{action.description}</p>

                <div className="flex items-center gap-1 mt-3 text-xs text-eva-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Start</span>
                  <ArrowRight size={11} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div>
          <h2 className="text-sm font-semibold text-eva-text mb-4">This Week</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Sessions" value={stats.sessionsThisWeek} unit="sessions" delay={0} />
            <StatCard label="Speaking Time" value={stats.totalSpeakingMinutes} unit="mins" delay={0.05} />
            <StatCard label="Avg Score" value={`${stats.averageScore}%`} unit="" delay={0.1} />
            <StatCard label="Words Learned" value={stats.wordsLearned} unit="words" delay={0.15} />
          </div>
        </div>
      )}

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-panel rounded-2xl p-5"
      >
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-eva-accent/10 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-eva-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-eva-text mb-1">Pro Tip</p>
            <p className="text-xs text-eva-text-dim leading-relaxed">
              Consistency beats intensity. Even 10 minutes of daily practice with Eva will produce remarkable improvement in your fluency and confidence within a month.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function StatPill({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-eva-border/50 text-xs text-eva-text-dim">
      {icon}
      <span>{value}</span>
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  delay,
}: {
  label: string
  value: string | number
  unit: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="glass-panel rounded-xl p-4"
    >
      <p className="text-xs text-eva-text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-eva-text">
        {value}
        {unit && <span className="text-sm font-normal text-eva-text-muted ml-1">{unit}</span>}
      </p>
    </motion.div>
  )
}
